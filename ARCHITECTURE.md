# Chameleon Console — Architecture

*Written 2026-08-09. `HANDOFF.md` was the original pre-build plan (Stage 1-4 wiring, static-fixture-first) — it's been fully superseded by what's actually built and is kept only as historical record. This doc describes the console as it exists now.*

## What this is

Next.js app, the customer-facing surface for Chameleon: registry declaration, ghost-data findings, policy status, deletion requests, proof certificates, on-demand decrypt, and (for BYOC deployments) login. Never talks to BigQuery or Key Vault's GCP resources directly — every page goes through this app's own `app/api/*` routes, which proxy to Key Vault (`lib/vault-api.ts`) or, for multi-project accounts, to `chameleon-onboarding`.

## Pages (`app/*/page.tsx`)

`overview`, `registry`, `ghost-data`, `policy`, `deletion`, `proof`, `integrations`, `decrypt`, `decrypted-views` — all real, all wired to live API routes, not the static fixtures the original handoff plan described as Stage 1. `login` + `login/operator` + `claim/[token]` are the auth surface (see below). `projects` is the multi-project account switcher.

## Two auth models, coexisting

1. **Static / single-deployment** (original model, still the default for BYOC): a shared `CONSOLE_PASSWORD` cookie, checked by `proxy.ts` (Next.js 16's replacement for `middleware.ts`). When active, `project-context.ts`'s `staticContext()` resolves the deployment's Terraform-wired `VAULT_BASE_URL` etc. directly.
2. **Multi-project accounts** (added 2026-08, opt-in via `CONSOLE_SERVICE_CREDENTIAL`): real per-person sessions via `lib/session.ts` (HMAC-signed, Web Crypto API — not Node's `crypto` module, since `proxy.ts` may run on the Edge runtime). Login is magic-link (`app/api/login`, `app/login/claim/[token]`), backed by `chameleon-onboarding`'s `/api/console-auth/*` API (`lib/onboarding-client.ts`). `app/projects` lets a person switch between multiple customer projects tied to their account.

`project-context.ts` is the single resolver both models funnel through: try a real session first, fall back to `staticContext()` if no session or no `CONSOLE_SERVICE_CREDENTIAL` configured. This is why enabling multi-project accounts is safe to roll out gradually — any deployment that doesn't opt in behaves exactly as before.

There's also a break-glass **operator** login (`app/login/operator`) for internal use, separate from customer-facing magic-link auth.

## API routes (`app/api/*`) — all real, proxying to Key Vault or onboarding

`registry/{resources,discovery,schema,resources/[resourceId],sync-now}`, `deletion` + `deletion/[id]`, `decrypted-views` + `decrypted-views/[viewName]` + `decrypted-views/available-fields`, `decrypt`, `key-status/[userId]`, `admin/analyst-claims`, `claim/[token]`, `login`, `projects` + `projects/select`. Each one is a thin proxy — the actual logic lives in Key Vault; this layer exists because the browser can't call Key Vault directly (internal-only Cloud Run ingress) and because `project-context.ts` needs to resolve per-request which deployment's Key Vault to talk to.

**Known open bug, not yet fixed**: the `DELETE` route for registry resources sends `Content-Type: application/json` with an empty body, which Key Vault's Fastify server rejects (`FST_ERR_CTP_EMPTY_JSON_BODY`). The Delete button is currently broken in production. Flagged and deliberately left out of scope in the PR that found it (2026-08-07) to avoid scope creep — worth a small standalone fix.

## What the original handoff plan got right vs. what changed

The original "five outcomes" navigation model (Registry / Ghost Data / Policy / Deletion / Proof) held up and is still the page structure. What changed: the "Integrations" page's original spec (BigQuery/dbt/Salesforce/HubSpot connection status only) is now secondary to Registry/Decrypted Views/Decrypt, which didn't exist in the original plan at all — the product's center of gravity shifted from "connect and prove" toward "declare, sync, and decrypt via `pii_vault`" as that architecture matured.

## Deployment

Two paths: Vercel (Chameleon's own hosted instances — push to main auto-deploys) or self-hosted Cloud Run (`console.tf` in `chameleon-infra-gcp`, either pulling Chameleon's pre-built image or self-built via `build-own-images.sh` for BYOC). Same codebase either way; which auth model is active depends entirely on whether `CONSOLE_SERVICE_CREDENTIAL` is set, not on which deploy path was used.
