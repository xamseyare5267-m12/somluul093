#!/usr/bin/env bash
# Apply SomLuul schemas to PRIMARY Supabase project.
# Prerequisites: curl, and service role key.
#
#   export SUPABASE_URL=https://xxxx.supabase.co
#   export SUPABASE_SERVICE_ROLE_KEY=eyJ...
#   bash infra/scripts/01-supabase-primary.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
URL="${SUPABASE_URL:?Set SUPABASE_URL}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"

# Strip quotes/trailing slash
URL="${URL%\"}"
URL="${URL#\"}"
URL="${URL%/}"

echo "==> Applying schema.sql via SQL is manual in Supabase SQL Editor (recommended)."
echo "    1) Open ${URL} → SQL Editor"
echo "    2) Paste ${ROOT}/supabase/schema.sql and Run"
echo "    3) Paste ${ROOT}/supabase/schema_v2_scale.sql and Run"
echo "    4) Storage → create bucket: ${SUPABASE_BUCKET:-files-bucket} (Public ON for media)"
echo ""
echo "==> Health check (REST)"
code=$(curl -s -o /tmp/sl_health.json -w "%{http_code}" \
  "${URL}/rest/v1/app_state?select=id&limit=1" \
  -H "apikey: ${KEY}" \
  -H "Authorization: Bearer ${KEY}" || true)
echo "HTTP $code"
head -c 200 /tmp/sl_health.json 2>/dev/null; echo
if [[ "$code" != "200" ]]; then
  echo "NOTE: empty/404 until schema is applied and app writes once. Apply SQL first."
fi
echo "Done primary instructions."
