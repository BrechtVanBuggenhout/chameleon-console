// Base URL of the Pub/Sub Ingest Cloud Run worker (chameleon-infra-gcp's
// pii_pubsub_ingest_worker.tf), used only to show a customer the exact push
// endpoint to point their subscription at when declaring a system: 'pubsub'
// resource. NEXT_PUBLIC_ is required since the declare panel is a client
// component. Unset in local dev / before that Terraform resource exists.
export const PUBSUB_INGEST_BASE_URL = process.env.NEXT_PUBLIC_PUBSUB_INGEST_BASE_URL || ''
