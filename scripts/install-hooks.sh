#!/usr/bin/env bash
# Installe les hooks Git et pre-build l'image Docker tools.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT/.githooks"
SOURCE_DIR="$ROOT/scripts/git-hooks"

mkdir -p "$HOOKS_DIR"

echo "📝 Installation des hooks Git..."

cp "$SOURCE_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
cp "$SOURCE_DIR/pre-push"   "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/pre-commit" "$HOOKS_DIR/pre-push"

git config core.hooksPath .githooks

echo "🔨 Pre-build de l'image exscript-tools..."
docker compose -f "$ROOT/docker-compose.tools.yml" build tools

echo ""
echo "✅ Hooks Git installés"
echo "   - pre-commit : identité git + ruff format + ruff lint + ESLint"
echo "   - pre-push   : lint + tsc + env + lockfiles + migrations + tests + build prod"
echo ""
echo "⚠️  N'oublie pas de configurer ton identité git :"
echo "   git config --local user.name \"THIEBAUD Enzo\""
echo "   git config --local user.email \"ethiebaud@extia-inge.fr\""
