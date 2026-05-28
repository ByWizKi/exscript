#!/usr/bin/env bash
# Wrapper universel : exécute une commande dans le container tools.
# Build l'image si absente, puis délègue la commande.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! docker image inspect exscript-tools:latest >/dev/null 2>&1; then
    echo "🔨 Image exscript-tools manquante, build en cours..."
    docker compose -f "$ROOT/docker-compose.tools.yml" build tools
fi

if [[ "${OSTYPE:-}" == "msys" || "${OSTYPE:-}" == "cygwin" ]]; then
    USER_FLAG=""
else
    USER_FLAG="--user $(id -u):$(id -g)"
fi

exec docker compose -f "$ROOT/docker-compose.tools.yml" run --rm \
    $USER_FLAG tools "$@"
