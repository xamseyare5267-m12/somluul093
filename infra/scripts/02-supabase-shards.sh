#!/usr/bin/env bash
# Document + env generator for physical shards (N Supabase projects).
#
#   export SHARD_COUNT=4
#   bash infra/scripts/02-supabase-shards.sh
#
# You must CREATE each Supabase project in the dashboard, apply the same SQL,
# then fill SHARD_i_SUPABASE_URL and keys in your secrets manager.

set -euo pipefail
N="${SHARD_COUNT:-4}"
echo "# Generated shard env skeleton — fill URLs after creating projects"
echo "SHARD_COUNT=${N}"
echo "SCALE_MODE=1"
for i in $(seq 0 $((N - 1))); do
  echo ""
  echo "# --- Shard $i ---"
  echo "# 1) Create Supabase project somluul-shard-$i"
  echo "# 2) Run schema.sql + schema_v2_scale.sql"
  echo "# 3) Create storage bucket files-bucket (public)"
  echo "SHARD_${i}_SUPABASE_URL=https://YOUR_PROJECT_REF_SHARD_${i}.supabase.co"
  echo "SHARD_${i}_SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_SHARD_${i}"
done
echo ""
echo "# Primary still used when shard-specific URL missing:"
echo "# SUPABASE_URL=..."
echo "# SUPABASE_SERVICE_ROLE_KEY=..."
echo ""
echo "NOTE: App routing helpers are ready (src/server/scale/sharding.ts)."
echo "Full per-shard connection pooling in every repo query is a follow-up cutover;"
echo "start with SHARD_COUNT=1 until single DB is stable under load."
