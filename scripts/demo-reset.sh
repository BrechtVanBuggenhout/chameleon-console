#!/usr/bin/env bash
set -euo pipefail

# Demo reset: create a fresh, crypto-shreddable demo user through the REAL
# ingestion path (GCS landing zone -> worker -> encrypt via Key Vault -> Pub/Sub
# -> raw_users). Run this 30+ minutes before any demo so the live deletion
# always has an un-shredded user to destroy.
#
# Requirements: gcloud auth (account with access to chameleon-prod-496718),
# gsutil, bq. Usage: ./demo-reset.sh [user_id]

PROJECT="chameleon-prod-496718"
BUCKET="chameleon-landing-prod-chameleon-prod-496718"
DATASET="chameleon_prod"

SUFFIX="$(date +%m%d-%H%M)"
USER_ID="${1:-usr-demo-$SUFFIX}"
EMAIL="demo-$SUFFIX@chameleon-data.com"

TMP="$(mktemp -t demo-user.XXXX).csv"
printf 'user_id,email\n%s,%s\n' "$USER_ID" "$EMAIL" > "$TMP"

echo "Seeding demo user: $USER_ID <$EMAIL>"
gsutil -q cp "$TMP" "gs://$BUCKET/inbound/demo-reset-$SUFFIX.csv"
rm -f "$TMP"
echo "Uploaded to landing zone. Worker polls every 60s; waiting for ingestion…"

for i in $(seq 1 20); do
  sleep 15
  N="$(bq query --project_id="$PROJECT" --use_legacy_sql=false --format=csv \
    "SELECT count(*) FROM \`$PROJECT.$DATASET.raw_users\` WHERE user_id='$USER_ID'" \
    2>/dev/null | tail -1 || echo 0)"
  if [ "${N:-0}" -ge 1 ] 2>/dev/null; then
    echo ""
    echo "✓ $USER_ID is ingested and encrypted (attempt $i)."
    echo "  Ready for a live shred: Console -> Deletion -> enter '$USER_ID' -> Trigger."
    exit 0
  fi
  echo "  …not there yet (check $i/20)"
done

echo "✗ Timed out after ~5 minutes. Check the ingestor worker logs:"
echo "  gcloud run services logs read chameleon-pii-ingestor-worker-prod --project $PROJECT --limit 50"
exit 1
