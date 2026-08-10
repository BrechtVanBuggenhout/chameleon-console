# Chameleon Console — How It Works & Field Reference

*Written 2026-08-10. Companion to `ARCHITECTURE.md` (which describes the Next.js app's internal structure) — this doc is the practical "what do I actually fill in, and where do I see the result" guide for using the console day to day. If a field or behavior described here changes, update this file in the same PR.*

## 1. The shape of the system

```
Console (Next.js, this app)
  │  every page proxies through app/api/* — the browser never talks to
  │  Key Vault or BigQuery directly
  ▼
Key Vault (chameleon-key-vault, Cloud Run)
  │  owns the PII registry, encryption keys, deletion state machine,
  │  decrypted-view declarations
  ├──▶ BigQuery (pii_vault table, decrypted views, your source tables)
  └──▶ chameleon-data-pipelines (Cloud Run worker)
         syncs your declared source tables INTO pii_vault on a daily
         schedule or on demand ("Sync Now")
```

Three things live in three different places, and most of the confusing fields in the console exist to connect them:

- **Your source tables** — data you already had (BigQuery, GCS, etc.), declared but never modified unless you opt in to source redaction (§7).
- **`pii_vault`** — Chameleon's own encrypted copy, one row per `(tenant_id, user_id, resource_id, field_name)`. This is what actually gets crypto-shredded.
- **Decrypted views** — BigQuery views that read `pii_vault` and decrypt live, on query, for an approved consumer.

## 2. `tenant_id` — three different things share this name

This is the single most confusing part of the console, because **three unrelated concepts are all called "tenant ID"**:

### (a) This deployment's tenant ID
A Chameleon deployment (BYOC or managed) is single-tenant by design — `NEXT_PUBLIC_TENANT_ID` (default `"default-tenant"`), set once in Terraform, the same value on both the console and the sync worker. You almost never touch this directly. If it ever needs to differ between the console and `chameleon-data-pipelines`' worker, deletions silently 404 (the console can trigger a real deletion but never find the resulting certificate) — if that happens, it's this value that's out of sync, not a bug in the deletion flow itself.

### (b) The "Tenant ID" field in the Declare panel
Pre-filled from (a), editable. **Leave it at the default** unless this one Chameleon instance genuinely manages more than one customer/tenant. This is which tenant *owns the declaration itself* — it scopes who can see and edit this registry entry, nothing about the data inside the table.

### (c) The "Tenant ID column" field in the Declare panel
**This is not a value you type — it's the name of a column that already exists in your source table.** Leave it as `tenant_id` unless your table uses a different column name.

Fill this in only when **the single table you're declaring itself contains rows belonging to more than one of *your* customers** (e.g. a shared multi-tenant table with a `tenant_id`/`account_id`/`org_id` column). When set, the sync job reads that column's value out of each row and writes it as `pii_vault.tenant_id` for that row — meaning a *single declared table* can populate `pii_vault` under several different tenant IDs, one per your customer.

If you leave it blank, every row synced from that table gets the one deployment tenant ID from (a) instead.

**Rule of thumb:**
- Chameleon deployment serves one company → leave (b) at default, leave (c) blank.
- Chameleon deployment serves one company, but that company's own table has a multi-tenant column → fill in (c) with that column's name, still leave (b) at default.

### Where a `tenant_id` mismatch actually bites you
Decrypted Views and Decrypt both query `pii_vault` filtered by "the tenant ID this project connection currently resolves to" (see §4). If a resource was synced with a `tenantIdColumn` (c) that produced different `tenant_id` values than what the console is now querying with, you'll see **"Nothing has synced into pii_vault for this tenant yet"** even though the sync genuinely ran and rows genuinely exist — just under a different `tenant_id` value. The Decrypted Views declare panel now shows exactly which `tenant_id` it queried (see §7) — if you expected rows and see none, compare that value against what your source table's tenant column actually contains, and against `SELECT DISTINCT tenant_id, COUNT(*) FROM pii_vault GROUP BY tenant_id` run directly in BigQuery.

This is also the first thing to check after any redeploy: a stale `PII_VAULT_RESOURCE_ID` / `GCP_PROJECT_ID` env var on the Key Vault Cloud Run revision, or a project connection pointed at the wrong tenant, produces the exact same symptom — a real, populated `pii_vault` that looks empty from the console because it's being queried under the wrong project/dataset or the wrong tenant.

## 3. What the other Declare-panel fields actually do

| Field | What it is | Required for |
|---|---|---|
| Resource ID | `system:project.dataset.table` | always |
| Resource layer | RAW / STAGING / INTERMEDIATE / MART / SAAS — governs policy strictness | always |
| **User ID column** | Column that scopes rows to one user — this is the join key `pii_vault` syncs on | Crypto shred deletion strategy |
| **Tenant ID column** | See §2(c) — column name, not a value | only multi-tenant source tables |
| **Last-modified column (optional)** | Column name (TIMESTAMP/DATETIME) the sync job uses to scan only rows changed since the last sync, instead of a full table scan every time | opt-in — leave blank for full-scan-every-time (correct default for small/medium tables) |
| Deletion strategy | What crypto-shred actually does — Crypto shred (destroy the key) needs User ID column; others don't | always |
| What happens to this table on deletion (source redaction) | Only meaningful for manually-declared resources — see §8 | optional, defaults to "leave as-is" |
| PII columns | Per-column classification + handling | always, ≥1 column |

**A known UI bug that's now fixed:** if a resource has a "Last-modified column" saved and you reopen it to edit, the field used to always show "— None —" regardless of what was actually saved — it looked like the save silently failed. The save was always working; the edit panel just wasn't re-loading that one field when hydrating from the existing declaration. Fixed 2026-08-10 (`registry-table.tsx`'s `openEdit`) — editing now correctly shows the saved value.

## 4. How multiple projects work

Two separate, unrelated "multi-" concepts:

- **Key Vault itself is one-deployment-per-GCP-project.** Not multi-tenant across projects — `GCP_PROJECT_ID` is read once at boot and fixes which project's BigQuery/Firestore that Cloud Run instance talks to. If two customers (or two of your own environments) need isolation, that's two separate Key Vault deployments, not one shared one. This is deliberate: sharing one Cloud Run instance across projects would need cross-project IAM and isn't how the service is built.
- **The console's "Projects" page is an account-level connection switcher.** One console instance, one login, can be wired to *several* separately-deployed Key Vault instances — each "project" in that list just stores a `vaultBaseUrl` + `tenantId` + tokens for one Key Vault deployment. Selecting a project picks which deployment's data you're looking at; it does not change how many Key Vault instances exist.

So: **reusing one Cloud Run Key Vault across projects that share real IAM boundaries isn't supported** — if you need cross-project reuse, that has to be a conscious backend change (a real multi-tenant credential/IAM model in Key Vault), not something the console's project switcher already gives you. For separate teams/customers, the current answer is: one Key Vault Cloud Run instance each, connected as separate "projects" in this one console if you want a single pane of glass over all of them.

There's no independent "which GCP project does this resource belong to" field — a declared resource is implicitly scoped to whichever Key Vault deployment (i.e. whichever project connection) you declared it against.

## 5. "Unique key" — three different definitions, by layer

- **A registry declaration** is unique by `(tenantId, resourceId)` — you can't declare the same `resourceId` twice under the same tenant.
- **A `pii_vault` row** is unique by `(tenant_id, user_id, resource_id, field_name)` — one row per user per field per source resource.
- **The `chameleon_pii` dbt package's own registry model** is unique by `(resource_id, field_name)` — a separate registry, dbt-side, with no tenant dimension at all.

If something looks like a duplicate or a missing row, check which of these three you're actually looking at first.

## 6. `build-own-images.sh` — building your own container images

`chameleon-infra-gcp/scripts/build-own-images.sh` builds Key Vault, the PII ingestor worker, and Console from source and pushes them to **your own** Artifact Registry, so your deployment never depends on Chameleon's own registry staying up. Entirely optional — skip it and `bootstrap.sh` pulls Chameleon's pre-built images instead.

```bash
./scripts/build-own-images.sh [gcp_project_id] [region]
```

`gcp_project_id` now defaults to `gcloud config get-value project` if you omit it (previously always required). `region` defaults to `us-central1`. The registry path itself (`REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"`) is always derived from these two values plus the fixed repo name `chameleon` — there's nothing to fill in by hand; the script prints the three resulting image URIs at the end for you to paste into `terraform.tfvars`.

## 7. Sync Now — global and per-resource

The daily sync (7:00 AM UTC) and "Sync Now" both enumerate every manually-declared resource, encrypt-and-diff each user's declared fields, and write into `pii_vault`. "Sync Now" always does a **full** scan (never incremental), since its usual purpose is "I just declared/changed something, don't wait for the watermark logic to notice."

As of 2026-08-10, Sync Now can be scoped to a single resource: the registry table has a **per-row "Sync now"** button next to Edit/Delete for manually-declared resources, alongside the existing header "Sync now" button (still syncs every manual resource for the tenant). Both call the same underlying job — `PiiVaultSyncJob.sync_one(resource_id)` vs `.sync_all()` — via an optional `resourceId` threaded through the console → Key Vault → worker chain.

**Deployment note:** this only takes effect once `chameleon-key-vault` and `chameleon-data-pipelines` are redeployed with the updated code — the console-side change alone will send the right `resourceId`, but an old-code Key Vault/worker will silently ignore it and fall back to syncing everything, same as before.

The registry table also now shows a **"Last synced"** column (the server-managed `lastSyncedAt` watermark, previously tracked but never surfaced anywhere in the UI) — "Never synced" means exactly that, not "the column doesn't exist."

## 8. Source redaction (what happens to your original table on deletion)

Crypto-shredding the key always fully protects Chameleon's own `pii_vault` copy — this setting is about whether Chameleon also acts on your original source table:

- **NONE (default)** — leave the source table exactly as-is.
- **REDACT_IN_PLACE** — on that user's deletion, null out the declared PII columns directly in the source table (never deletes rows, never touches other columns). Needs a real write grant on that table.
- **SHADOW_COPY** — never touches the source; instead maintains a separate de-identified view that mirrors it with PII columns dropped once the user's key is destroyed.

Only meaningful for manually-declared resources.

## 9. Decrypted Views

Decrypted views are plain BigQuery **logical views** (not materialized) in the `decrypted_views` dataset — nothing is ever written to storage. They decrypt live, per query, via a BigQuery remote function (`chameleon_batch_decrypt`) that calls back into Key Vault. Declaring a view (`app/decrypted-views`) always builds it on top of the central `pii_vault` table, never a customer-supplied source directly — every field that has ever synced into `pii_vault` is already crypto-anchored by construction, so there's no separate "declare `pii_vault` itself" step.

**"Nothing has synced into pii_vault for this tenant yet"**: the declare panel now shows exactly which `tenant_id` came back empty, to make the mismatch case in §2 diagnosable instead of looking identical to "sync never ran."

**Triggering a decrypted view refresh from dbt or a downstream job:** there is currently no dbt `post-hook` / `on-run-end` wiring, and no Cloud Run Job — this is a real gap, not a hidden feature. What *does* exist today that a "run after dbt, then push to SendGrid" flow could be built on:
- The `chameleon_batch_decrypt` remote function is a working example of warehouse SQL calling out to Cloud Run — a decrypted view is always live, so there's nothing to "refresh" per se; querying it *is* the trigger.
- `PiiVaultSyncTrigger` / `POST /pii-registry/sync-now` is a working example of an on-demand HTTP trigger, callable from anywhere (including a scheduled job) with an OIDC-authenticated Cloud Run call.
- The pattern to reuse for a "dbt finishes → do something" flow is the same one the daily sync already uses: Cloud Scheduler → OIDC → Cloud Run HTTP endpoint. Nothing wires a dbt run's completion to that today; it would need a new small endpoint (or reusing an existing one) called from your dbt orchestrator's own post-run step, not from inside dbt itself.
- There's no SendGrid or other downstream-notification integration anywhere in these repos today — that leg would be entirely new.

## 10. Decrypt page — the "User identifier" field

`app/decrypt` looks up one field for one user: **Resource ID, User identifier, Field name → decrypted value**. The "User identifier" field expects the **literal value from the row's `user_id` column** in `pii_vault` — i.e. whatever value was actually in the column you set as "User ID column" when declaring that resource (could be a numeric ID, a UUID, an email — whatever your source table uses), as a string, exactly as it was synced.

**What it does *not* accept**, despite being tempting to try:
- `user_id` (the column *name*) — never matches; the lookup is `WHERE user_id = @userId`, an exact-value match, not a column reference.
- `token` — a completely different column in `pii_vault` (a one-way HMAC join key), not queried by this endpoint at all.
- `encrypted_value` — that's the *output* of a successful lookup (the ciphertext), not an input.

**Why failures all look the same:** a wrong user identifier, a user whose key has already been shredded, and a field that was never synced for that user all deliberately return the identical `{ value: null }` — this is intentional (never leak *why* a value is unavailable), but it means the console currently gives you no way to discover a valid `user_id` for a resource before trying to decrypt one. If you're not sure what value to use, check the source table's declared User ID column directly, or look at a row that's already known to be synced.

## 11. Where to find results

| What you did | Where to see the outcome |
|---|---|
| Declared a resource | Registry tab — Status column (Declared / PENDING_REVIEW), "Last synced" column |
| Ran Sync Now | The message under the button (`Queued N chunks across M resources`, or the per-row inline message); actual sync happens moments later, off-screen — check "Last synced" a bit after, or Cloud Run logs for `chameleon-pii-ingestor-worker-*` |
| Declared a decrypted view | Success message shows the resulting `bigquery_dataset.bigquery_view_name` — query it directly in BigQuery |
| Triggered a deletion | Deletion tab shows the state machine live; Proof tab has the resulting certificate once complete |
| Something failed silently | Cloud Run logs for `chameleon-key-vault-*` (declarations, sync-now, decrypt) or `chameleon-pii-ingestor-worker-*` (the actual sync/encrypt work) are the source of truth — the console surfaces `error` fields from these but doesn't duplicate full server logs |

## Known open gaps (tracked here, not yet fixed)

- The registry `DELETE` route sends `Content-Type: application/json` with an empty body, which Key Vault's Fastify server rejects — the Delete button is currently broken in production (see `ARCHITECTURE.md`).
- `pii_vault_sync.py`'s `_fetch_existing_fields` idempotency check is scoped by `resource_id` + `user_id`, not also `tenant_id` — not currently exploitable (user IDs are drawn from one resource at a time) but worth tightening if resource IDs are ever reused across tenants.
- No dbt-triggered on-demand decrypted-view/notification pipeline exists yet (§9) — roadmap only (`chameleon-pii-dbt`'s planned `publish_registry` run-operation is the closest unbuilt piece).
