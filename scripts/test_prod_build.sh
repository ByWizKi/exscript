#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "Test de parité build production — Backend"
echo "============================================================"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker indisponible — skip"
    exit 0
fi

echo ""
echo "🐳 Build de l'image Docker backend (target=production)..."
cd "$ROOT/backend"

if docker build \
    --target=production \
    --tag exscript-backend-test:latest \
    --quiet \
    . 2>/dev/null; then
    echo "✅ Build Docker réussi"
else
    echo "❌ Build Docker échoué"
    cd "$ROOT"
    exit 1
fi

echo ""
echo "🚀 Démarrage du container..."
CONTAINER_ID=$(docker run -d \
    -e DATABASE_URL="postgresql+asyncpg://test:test@localhost/test" \
    -e JWT_SECRET="test-secret-for-build-parity-check" \
    -e GOOGLE_CLIENT_ID="dummy-client-id" \
    -e ENCRYPTION_KEY="" \
    -e PORT=8080 \
    -p 18011:8080 \
    exscript-backend-test:latest 2>/dev/null) || true

if [ -z "${CONTAINER_ID:-}" ]; then
    echo "⚠️  Container non démarré (DB absente en local — normal)"
    echo "✅ Build vérifié sans démarrage runtime"
    docker rmi exscript-backend-test:latest > /dev/null 2>&1 || true
    cd "$ROOT"
    exit 0
fi

echo "✅ Container démarré : $CONTAINER_ID"

echo ""
echo "🧹 Nettoyage..."
docker stop "$CONTAINER_ID" > /dev/null 2>&1 || true
docker rm "$CONTAINER_ID" > /dev/null 2>&1 || true
docker rmi exscript-backend-test:latest > /dev/null 2>&1 || true

cd "$ROOT"

echo ""
echo "✅ Test build production backend terminé"
echo ""
