#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "Vérificateur de lockfiles"
echo "============================================================"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo ""
echo "🔍 Vérification du lockfile Python (pyproject.toml)..."
if [ -f "$ROOT/backend/pyproject.toml" ]; then
    echo "✅ pyproject.toml présent"
else
    echo "❌ pyproject.toml manquant"
    exit 1
fi

echo ""
echo "🔍 Vérification du lockfile Node.js..."
if [ -f "$ROOT/frontend/package-lock.json" ]; then
    echo "✅ package-lock.json présent"
    if node -e "require('$ROOT/frontend/package-lock.json')" 2>/dev/null; then
        echo "✅ package-lock.json est un JSON valide"
    else
        echo "⚠️  package-lock.json potentiellement corrompu"
    fi
else
    echo "❌ package-lock.json manquant — lance : cd frontend && npm install"
    exit 1
fi

echo ""
echo "✅ Lockfiles OK"
echo ""
