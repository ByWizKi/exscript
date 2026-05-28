#!/bin/sh
# Point d'entrée production (Cloud Run)
# Cloud Run injecte $PORT (généralement 8080)
set -e

echo "▶ Migrations Alembic..."
alembic upgrade head

echo "▶ Démarrage uvicorn sur port ${PORT:-8080}..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8080}" \
  --workers 2 \
  --proxy-headers \
  --forwarded-allow-ips "*"
