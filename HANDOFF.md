# Handoff from chameleon-site to chameleon-console

This document summarizes the context and plan for developing the `chameleon-console` application, as discussed in the `chameleon-site` repository session.

## Session Context

The primary goal identified from the `website_roadmap.md` in the `chameleon-site` repository is to develop the `chameleon-console`. The `chameleon-site` is largely feature-complete for its marketing purposes, and the next strategic step is the implementation of the interactive demo console.

## Agreed-Upon Plan for chameleon-console

The development of the `chameleon-console` will proceed as follows:

1.  **Create the Demo Console Application:** Scaffold a new Next.js application.
2.  **Install Dependencies:** Set up the project with TypeScript, Tailwind CSS, and `shadcn/ui`.
3.  **Implement Basic Structure:** Create the main layout and navigation with placeholders for the following pages:
    *   Overview
    *   Registry
    *   Ghost Data
    *   Policy
    *   Deletion
    *   Proof
    *   Integrations
4.  **Implement Access Control:** Add a simple, shared password protection using Next.js middleware for initial stages.
5.  **Build Pages with Static Data:** Develop the UI for each page using static JSON data, following the "Wiring Plan" (Stage 1) to enable frontend development without live backend services initially.

## Relevant Excerpts from website_roadmap.md

### Architecture Overview

### Demo Console

Repository: `chameleon-console`

Purpose: Interactive product demo, customer demonstrations, future SaaS frontend.

Stack: Next.js, TypeScript, Tailwind, shadcn/ui.

The console communicates with Key Vault APIs. The website never talks directly to BigQuery.

### Demo Console Roadmap

### Goal

A believable compliance demo that follows the public demo script end-to-end.

Repository: `chameleon-console`

### Navigation

| Item | Maps to outcome |
|---|---|
| Overview | Summary of all five outcomes |
| Registry | Outcome 1: Discover PII |
| Ghost Data | Outcome 2: Record ghost-data findings from configured warehouse scans |
| Policy | Outcome 3: Enforce warehouse policy |
| Deletion | Outcome 4: Execute deletion workflows |
| Proof | Outcome 5: Prove deletion |
| Integrations | Connected systems |

Note: Settings is excluded until there is a defined spec for what it controls.

### Access model

Recommendation for Stage 1–2: shared password via an environment variable, enforced by a middleware check in Next.js. Revisit for Stage 3+.

### Console Pages

#### Overview

Source: static data in Stage 1, Key Vault APIs from Stage 2.

Display:
- Registry resource count
- Policy status
- Ghost finding count
- Last deletion proof timestamp and status

#### Registry

Source: `GET /pii-registry/resources`

Display:

| Column | Description |
|---|---|
| Resource | Table or model name |
| PII columns | Column names with PII classification |
| Deletion strategy | How data is removed (e.g. key destroy, row delete) |
| Classification | Sensitivity level |
| Status | Declared / ghost / policy warning |

#### Ghost Data

Source: lineage events (Stage 3), static fixtures (Stage 1–2).

Display:

| Column | Description |
|---|---|
| Resource | Table or model name |
| Column | Column name |
| Pattern | Detection pattern that triggered the finding |
| Count | Number of affected rows |
| Recommended action | Register column or remove source data |

#### Policy

This page has no current spec. Before building, define:

- What constitutes a policy violation
- Where policy rules are authored (dbt metadata, Key Vault, or both)
- What actions a user can take from this page

Placeholder: surface the policy status badge (PASS / WARN / FAIL) from the Key Vault policy API and list the rules that contributed to the current status.

#### Deletion

Sources: `POST /deletion-request`, `GET /proof-status`

Display:
- User identifier input
- Trigger deletion button
- Execution timeline (which systems were reached, in order)
- Status per system

#### Proof

Source: `GET /deletion-proof/:id`

Display:
- User identifier
- Affected systems
- Proof certificate (signed, timestamped)
- Audit trail

#### Integrations

Display: connection status only for BigQuery, dbt, Salesforce, and HubSpot. No configuration UI in Stage 1–2.

## Wiring Plan

| Stage | Data source | Goal | Backend dependency |
|---|---|---|---|
| 1 | Static JSON fixtures | Look real; no errors | None |
| 2 | Key Vault APIs | Show real registry data | `KEY_VAULT_URL`, `KEY_VAULT_TOKEN` |
| 3 | Pipelines | Show live ghost findings and lineage | Pipelines repo |
| 4 | Salesforce sandbox | Real end-to-end deletion proof | Salesforce credentials |

Key Vault endpoints consumed from Stage 2:

```
GET  /pii-registry/resources
GET  /pii-registry/policy
GET  /lineage
GET  /deletion-proof/:id
POST /deletion-request
```

## Public Demo Script

This script is the source of truth for what the demo console must be able to show. Each step maps to a console page and a wiring stage.

| Step | Action | Console page | Available from |
|---|---|---|---|
| 1 | Show registry resources | Registry | Stage 1 |
| 2 | Run ghost scan | Ghost Data | Stage 1 (static), Stage 3 (live) |
| 3 | Display ghost PII finding | Ghost Data | Stage 1 |
| 4 | Display policy warning | Policy | Stage 2 |
| 5 | Trigger deletion | Deletion | Stage 2 |
| 6 | Show downstream wipe execution | Deletion | Stage 2 |
| 7 | Show proof certificate | Proof | Stage 2 |
| 8 | Demonstrate audit trail | Proof | Stage 2 |
