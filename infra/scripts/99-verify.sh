#!/usr/bin/env bash
# Post-deploy verification
#   export API_BASE=https://api.yourdomain.com
#   bash infra/scripts/99-verify.sh

set -euo pipefail
API="${API_BASE:?Set API_BASE e.g. https://api.example.com}"
API="${API%/}"

echo "==> GET /api/health"
curl -fsS "${API}/api/health" | head -c 800; echo

echo "==> GET /api/ops/ready"
code=$(curl -s -o /tmp/ops_ready.json -w "%{http_code}" "${API}/api/ops/ready" || true)
echo "HTTP $code"
cat /tmp/ops_ready.json; echo
if [[ "$code" != "200" ]]; then
  echo "FAIL: ops/ready not 200"
  exit 1
fi

echo "==> GET /api/scale/status"
curl -fsS "${API}/api/scale/status" | head -c 800; echo || echo "(may need auth on some deploys — status is public in this app)"

echo "==> GET /api/ops/health"
curl -fsS "${API}/api/ops/health" | head -c 1200; echo

echo "OK: basic infra checks passed"
echo "Next: browser test two users — post, message, call"
