# Chameleon demo runbook

The 10-minute live demo, the prep checklist that makes it un-failable, and the
answers to the questions that follow. Console: https://chameleon-console.vercel.app

## 30+ minutes before the call

1. **Seed a fresh shreddable user** (the one thing that can kill the demo —
   crypto-shred is irreversible, so yesterday's demo user is a brick):

   ```bash
   ./scripts/demo-reset.sh          # creates usr-demo-<MMDD-HHMM>
   ```

   Wait for the ✓ and note the user id. This runs the REAL pipeline
   (landing zone → encrypt via Key Vault → raw_users), so it doubles as a
   check that prod is healthy.

2. **Click through every page once**: Overview (coverage gauge renders),
   Registry, Ghost Data, Policy, Deletion, Proof. Cold Cloud Run can take a
   few seconds on first hit — warm it before the audience is watching.

3. **Terminal ready** (if the audience is technical): a shell in
   `chameleon-dataplatform-dbt` where `.venv/bin/dbt run-operation pii_report`
   works. Font size up.

4. **Close everything else.** One browser window: console. One terminal.
   Slides (if any) in a third space. Notifications off.

## The 10-minute flow

| # | Where | What to do | The line that lands |
|---|---|---|---|
| 1 | Overview | Point at the coverage gauge | "One number: what % of the PII in this warehouse could we provably erase today." |
| 2 | Registry | Scroll the resources | "The inventory — composed automatically from pipelines, dbt metadata, and human declarations. Nobody maintains a spreadsheet." |
| 3 | Ghost Data | Show findings (or the clean state) | "This is PII that exists in the warehouse but that nobody declared. Found by scanning *metadata* — zero bytes of data read. We caught a real leak in our own mart layer this way." |
| 4 | Deletion | Enter the fresh `usr-demo-…` id, trigger, watch the states | "Deletion here isn't a DELETE statement. We destroy the user's encryption key — every copy of their data anywhere becomes permanently unreadable. Watch the state machine." |
| 5 | Proof | Open the certificate, decode it | "This is what you hand an auditor: a signed certificate — when, which key, and which systems the data had reached. Deletion with evidence, not a ticket saying 'done'." |
| 6 | Terminal (optional) | `dbt run-operation pii_report` | "And the discovery layer is a free open-source dbt package — you could run this on your own warehouse this afternoon." |

Total: ~8 minutes demoed slowly. Leave the silence after the certificate —
that's the moment people ask questions.

## The question that always comes: "How would *we* use this?"

Three tiers, in this order:

1. **Today, self-serve, free** — the `chameleon_pii` dbt package
   (github.com/BrechtVanBuggenhout/chameleon-pii-dbt). PII inventory, lineage,
   shred-readiness on their own warehouse. Nothing leaves their environment.
   BigQuery today, Snowflake in progress.
2. **Design-partner pilot (weeks)** — the visibility layer (registry,
   discovery, ghost data, coverage) deployed against their warehouse,
   read-only, metadata-only, hand-onboarded by us. White-glove by design.
3. **Provable erasure (roadmap)** — crypto-shred + certificates for data
   ingested going forward. Honest limit, state it proudly: retrofitting
   *existing* plaintext data to per-user encryption is an open problem we're
   researching; new pipelines get the guarantee from day one.

## Other predictable questions

- **"Where does our data go?"** Nowhere. Discovery reads INFORMATION_SCHEMA
  (column names). The deployment model for a pilot is inside *your* cloud
  project — we never host your data.
- **"What if a SaaS wipe fails after the key is destroyed?"** The state
  machine has an explicit CASCADE_PARTIAL_FAILURE state; certificates are only
  issued on full completion. Failure is representable, not hidden.
- **"Is key destruction legally erasure?"** Cryptographic erase is a
  recognized sanitization method (NIST SP 800-88); regulators have accepted
  key destruction under conditions. [Follow-up with specifics rather than
  overclaiming on the call.]
- **"What about backups / time travel?"** Ciphertext in a backup is as dead as
  ciphertext in a table once the key is gone — that's the core advantage of
  crypto-shred over row deletion.

## If something breaks live

- **Deletion fails / user already shredded**: fall back to Proof page for a
  previously shredded user (usr-001…005 have certificates) — "here's one we
  ran earlier" and decode that certificate instead.
- **Console slow/cold**: talk over the first load ("runs on scale-to-zero
  infra — your deployment would be always-warm").
- **pii_report errors**: `dbt build --select package:chameleon_pii` first, or
  skip tier-6 and point at the GitHub README's sample output.
- **Total outage**: the /learn article walkthrough
  (chameleon-data.com/learn/dbt-pii-package) has screenshots of everything.

## After the call

- Same-day email from hello@chameleon-data.com: thanks, the package link, the
  article link, and ONE concrete next step (usually: "install the package on a
  dev project; I'll help you read the results").
- Log what they asked. Their questions are the roadmap.
