#!/usr/bin/env python3
"""Détecte les patterns dangereux dans les migrations Alembic.

Détecte :
  - DROP COLUMN (WARNING — perte de données)
  - CREATE INDEX sans CONCURRENTLY (WARNING — lock de table)
  - ALTER TABLE ADD NOT NULL sans DEFAULT (ERROR — bloque sur table non-vide)
"""

import re
import sys
from pathlib import Path


def check_migration_safety(filepath):
    with Path(filepath).open() as f:
        content = f.read()

    issues = {"errors": [], "warnings": []}

    if re.search(r"op\.drop_column|DROP COLUMN", content, re.IGNORECASE):
        issues["warnings"].append("Contient DROP COLUMN — risque de perte de données")

    if re.search(r"op\.add_column.*nullable=False", content) and not re.search(
        r"server_default|default", content
    ):
        issues["errors"].append("ADD COLUMN NOT NULL sans DEFAULT — échouera sur table non-vide")

    if "CREATE INDEX" in content and "CONCURRENTLY" not in content:
        if "op.execute" in content and "CREATE INDEX" in content:
            issues["warnings"].append("CREATE INDEX sans CONCURRENTLY — peut locker la table")

    return issues


def main():
    print("=" * 60)
    print("Vérificateur de sécurité des migrations")
    print("=" * 60)

    migrations_dir = Path(__file__).parent.parent / "migrations" / "versions"
    if not migrations_dir.exists():
        print("\n⚠️  Pas encore de migrations — rien à vérifier")
        print("\n✅ Vérification complète\n")
        return 0

    files = sorted(f for f in migrations_dir.glob("*.py") if not f.name.startswith("__"))
    print(f"\n📋 Vérification de {len(files)} migration(s)...")

    all_errors = []
    all_warnings = []

    for filepath in files:
        issues = check_migration_safety(filepath)
        for err in issues["errors"]:
            print(f"   ❌ {filepath.name}: {err}")
            all_errors.append(err)
        for warn in issues["warnings"]:
            print(f"   ⚠️  {filepath.name}: {warn}")
            all_warnings.append(warn)

    if not all_errors and not all_warnings:
        print("   ✓ Aucun pattern dangereux détecté")

    print(f"\n{'❌ Vérification ÉCHOUÉE' if all_errors else '✅ Vérification OK'}")
    if all_warnings:
        print(f"   {len(all_warnings)} avertissement(s) — à revoir avant déploiement en production")

    return 1 if all_errors else 0


if __name__ == "__main__":
    sys.exit(main())
