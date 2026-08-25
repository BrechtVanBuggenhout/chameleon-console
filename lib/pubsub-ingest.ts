// Base URL of the Pub/Sub Ingest Cloud Run worker (chameleon-infra-gcp's
// pii_pubsub_ingest_worker.tf), used only to show a customer the exact push
// endpoint to point their subscription at when declaring a system: 'pubsub'
// resource. Deliberately NOT NEXT_PUBLIC_-prefixed: this repo's CI never
// passes env vars at Docker build time (see deploy.yml's own comment) --
// only Terraform-owned Cloud Run runtime env vars, and Next.js inlines
// NEXT_PUBLIC_* at build time only, so a build-time-unset NEXT_PUBLIC_
// var can never pick up a runtime value no matter what Terraform sets.
// Read here server-side (app/registry/page.tsx) and threaded down as a
// prop into the client-side declare panel instead. Unset in local dev /
// before that Terraform resource exists.
export const PUBSUB_INGEST_BASE_URL = process.env.PUBSUB_INGEST_BASE_URL || ''
