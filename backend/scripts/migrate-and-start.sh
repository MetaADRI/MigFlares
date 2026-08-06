#!/bin/sh
# Runs prisma migrations then starts the API.
#
# Prisma migrations need a DIRECT (non-pooled) Postgres connection because
# Neon's PgBouncer pooler cannot take advisory locks. If DIRECT_URL is not set,
# derive it from DATABASE_URL by stripping the "-pooler" suffix from the host
# (Neon's direct host is the pooled host minus "-pooler").
set -e

if [ -z "$DIRECT_URL" ]; then
  echo "[migrate] DIRECT_URL not set — deriving from DATABASE_URL (removing -pooler)."
  export DIRECT_URL="$(echo "$DATABASE_URL" | sed 's/-pooler//')"
fi

echo "[migrate] Running prisma migrate deploy..."
npx prisma migrate deploy

echo "[migrate] Starting API..."
exec npm start
