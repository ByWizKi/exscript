#!/bin/bash
git config core.hooksPath .githooks
chmod +x .githooks/* scripts/install-hooks.sh
echo "✓ Hooks installed"
