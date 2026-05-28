#!/usr/bin/env python3
"""Valide les variables d'environnement requises par les Settings Pydantic.

Usage:
  python backend/scripts/validate_env.py [--ci] [--prod-check]

Modes:
  --ci        : Exit 1 si variable obligatoire manquante (pour CI/CD)
  --prod-check: Vérifie que les secrets existent dans GCP Secret Manager
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

GCP_SECRETS = {
    "DATABASE_URL",
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "ENCRYPTION_KEY",
}

REQUIRED_VARS = {"DATABASE_URL", "JWT_SECRET", "GOOGLE_CLIENT_ID"}


def validate_env_vars(ci_mode: bool = False) -> bool:
    missing = [v for v in sorted(REQUIRED_VARS) if not os.getenv(v, "").strip()]

    if missing:
        print(f"❌ Variables d'environnement manquantes ({len(missing)}) :")
        for var_name in missing:
            print(f"   - {var_name}")
        if ci_mode:
            print("\n⚠️  Mode CI : exit 1")
            return False
        else:
            print("\n⚠️  Avertissement : variables manquantes (mode dev — peut être normal)")
            return True

    print(f"✅ Les {len(REQUIRED_VARS)} variables obligatoires sont présentes")
    return True


def check_gcp_secrets() -> bool:
    print("\n🔍 Vérification GCP Secret Manager...")
    try:
        result = subprocess.run(
            ["gcloud", "secrets", "list", "--format=value(name)"],  # noqa: S607 — gcloud path varies by environment
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            print(f"⚠️  gcloud CLI indisponible ou non authentifié : {result.stderr[:200]}")
            return False

        existing_secrets = set(result.stdout.strip().split("\n"))
        missing_secrets = GCP_SECRETS - existing_secrets

        if missing_secrets:
            print(f"❌ Secrets manquants dans Secret Manager ({len(missing_secrets)}) :")
            for s in sorted(missing_secrets):
                print(f"   - {s}")
            return False

        print(f"✅ Les {len(GCP_SECRETS)} secrets existent dans Secret Manager")
        return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("⚠️  gcloud CLI indisponible — skip")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Valide les variables d'environnement")
    parser.add_argument("--ci", action="store_true", help="Mode CI : exit 1 si manquant")
    parser.add_argument("--prod-check", action="store_true", help="Vérifie GCP Secret Manager")
    args = parser.parse_args()

    print("=" * 60)
    print("Validateur de variables d'environnement")
    print("=" * 60)

    print(f"\n📋 Variables obligatoires : {sorted(REQUIRED_VARS)}")

    env_ok = validate_env_vars(ci_mode=args.ci)

    if args.prod_check:
        if not check_gcp_secrets():
            return 1

    if not env_ok and args.ci:
        return 1

    print("\n✅ Validation complète\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
