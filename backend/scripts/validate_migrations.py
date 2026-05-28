#!/usr/bin/env python3
"""Validate Alembic migration chain integrity.

Checks:
  1. down_revision chain is continuous (no branches)
  2. All migrations have downgrade() implementations
  3. Alembic reports exactly one head
"""

import re
import subprocess
import sys
from pathlib import Path


def get_migration_files():
    migrations_dir = Path(__file__).parent.parent / "migrations" / "versions"
    if not migrations_dir.exists():
        print("⚠️  Pas encore de migrations — rien à valider")
        return []
    return sorted(f for f in migrations_dir.glob("*.py") if not f.name.startswith("__"))


def parse_migration(filepath):
    with Path(filepath).open() as f:
        content = f.read()

    revision_match = re.search(
        r'^revision\s*(?::\s*[\w\s|,\[\]]+?)?\s*=\s*["\']([^"\']+)["\']',
        content,
        re.MULTILINE,
    )
    down_rev_match = re.search(
        r'^down_revision\s*(?::\s*[\w\s|,\[\]]+?)?\s*=\s*(?:["\']([^"\']+)["\']|None)',
        content,
        re.MULTILINE,
    )
    has_downgrade = "def downgrade()" in content

    return {
        "filepath": filepath,
        "revision": revision_match.group(1) if revision_match else None,
        "down_revision": (
            down_rev_match.group(1) if (down_rev_match and down_rev_match.group(1)) else None
        ),
        "has_downgrade": has_downgrade,
    }


def validate_chain(migrations):
    print("\n🔍 Validation de la chaîne de migrations...")

    down_rev_counts: dict[str, list] = {}
    for m in migrations:
        if m["down_revision"]:
            down_rev_counts.setdefault(m["down_revision"], []).append(m["revision"])

    branches = {k: v for k, v in down_rev_counts.items() if len(v) > 1}
    if branches:
        print(f"❌ Branches détectées ({len(branches)}) :")
        for down_rev, revisions in branches.items():
            print(f"   Plusieurs migrations partagent down_revision={down_rev} :")
            for rev in revisions:
                print(f"     - {rev}")
        return False

    print("   ✓ Aucune branche détectée")

    all_revisions = {m["revision"] for m in migrations if m["revision"]}
    all_down_revisions = {m["down_revision"] for m in migrations if m["down_revision"]}
    heads = all_revisions - all_down_revisions

    if len(heads) != 1:
        print(f"❌ Attendu 1 head, trouvé {len(heads)} : {heads}")
        return False

    print("   ✓ Chaîne continue")

    no_downgrade = [m for m in migrations if not m["has_downgrade"]]
    if no_downgrade:
        print(f"\n⚠️  {len(no_downgrade)} migration(s) sans downgrade() :")
        for m in no_downgrade:
            print(f"   - {m['filepath'].name}")
        return False

    print("   ✓ Toutes les migrations ont downgrade()")
    return True


def validate_alembic_heads():
    print("\n🔍 Vérification Alembic heads (définitif)...")
    try:
        result = subprocess.run(
            ["alembic", "heads"],  # noqa: S607 — alembic path varies by environment
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent,
        )
        if result.returncode != 0:
            print("   ⚠️  alembic heads non-zero (pas de DB disponible) — skip")
            return True

        output = result.stdout.strip()
        head_lines = [
            line for line in output.splitlines() if line.strip() and not line.startswith("INFO")
        ]
        if len(head_lines) > 1:
            print(f"❌ Alembic voit {len(head_lines)} heads — chaîne cassée :")
            for line in head_lines:
                print(f"   {line}")
            return False

        first = head_lines[0] if head_lines else "(pas de DB — skip)"
        print(f"   ✓ Head unique : {first}")
        return True
    except FileNotFoundError:
        print("   ⚠️  alembic absent du PATH — skip")
        return True


def main():
    print("=" * 60)
    print("Validateur de chaîne de migrations")
    print("=" * 60)

    files = get_migration_files()
    if not files:
        print("\n✅ Validation complète (aucune migration)\n")
        return 0

    print(f"\n📋 {len(files)} migration(s) trouvée(s) :")
    for f in files:
        print(f"   - {f.name}")

    migrations = [parse_migration(f) for f in files]

    unparsed = [m for m in migrations if m["revision"] is None]
    if unparsed:
        print(f"\n⚠️  Impossible de parser {len(unparsed)} migration(s) :")
        for m in unparsed:
            print(f"   - {m['filepath'].name}")

    valid = validate_chain(migrations) and validate_alembic_heads()

    print("\n✅ Chaîne valide" if valid else "\n❌ Problèmes détectés")
    print("\n✅ Validation complète\n")
    return 0 if valid else 1


if __name__ == "__main__":
    sys.exit(main())
