#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "Test de parité build production — Frontend"
echo "============================================================"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker indisponible — skip"
    exit 0
fi

echo ""
echo "🐳 Build de l'image Docker frontend (target=production)..."
cd "$ROOT"

if docker build \
    --target=production \
    --build-arg NEXT_PUBLIC_API_URL=http://localhost:8011 \
    --tag exscript-frontend-test:latest \
    --quiet \
    ./frontend 2>/dev/null; then
    echo "✅ Build Docker frontend réussi"
else
    echo "❌ Build Docker frontend échoué"
    exit 1
fi

echo ""
echo "🧹 Nettoyage..."
docker rmi exscript-frontend-test:latest > /dev/null 2>&1 || true

echo ""
echo "✅ Test build production frontend terminé"
echo ""
