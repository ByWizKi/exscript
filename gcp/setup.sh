#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# GCP Setup — ExScript
# Lance ce script UNE SEULE FOIS pour initialiser l'infra GCP.
# Prérequis : gcloud CLI installé et authentifié (gcloud auth login)
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Variables — MODIFIER AVANT DE LANCER ──────────────────────────────────────
PROJECT_ID="exscript"               # Projet GCP ExScript
REGION="europe-west1"                # Région (Paris)
DB_INSTANCE="exscript-db"            # Nom instance Cloud SQL
DB_NAME="exscript"                   # Nom de la base
DB_USER="exscript"                   # Utilisateur PostgreSQL
SERVICE_NAME="exscript-api"          # Nom service account Cloud Run
REPO_NAME="exscript"                 # Nom repo Artifact Registry
GITHUB_OWNER="ByWizKi"               # Username GitHub
GITHUB_REPO="exscript"               # Nom du repo GitHub

echo "🚀 Setup GCP ExScript — projet: $PROJECT_ID"
echo "────────────────────────────────────────────────"

# ── 1. Configurer le projet ────────────────────────────────────────────────────
gcloud config set project "$PROJECT_ID"
gcloud config set run/region "$REGION"

# ── 2. Activer les APIs nécessaires ───────────────────────────────────────────
echo "▶ Activation des APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com

# ── 3. Artifact Registry (registre Docker) ────────────────────────────────────
echo "▶ Création Artifact Registry..."
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --description="ExScript Docker images" \
  --quiet || echo "  (déjà existant)"

# ── 4. Cloud SQL PostgreSQL ────────────────────────────────────────────────────
echo "▶ Création Cloud SQL (PostgreSQL 16)..."
echo "  ⏳ Cela prend 5-10 minutes..."
gcloud sql instances create "$DB_INSTANCE" \
  --database-version=POSTGRES_16 \
  --edition=ENTERPRISE \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-type=SSD \
  --storage-size=10GB \
  --no-storage-auto-increase \
  --backup-start-time=03:00 \
  --availability-type=zonal \
  --quiet || echo "  (déjà existant)"

echo "▶ Création de la base de données..."
gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE" --quiet || echo "  (déjà existant)"

DB_PASSWORD=$(openssl rand -base64 24)
echo "▶ Création de l'utilisateur PostgreSQL..."
gcloud sql users create "$DB_USER" \
  --instance="$DB_INSTANCE" \
  --password="$DB_PASSWORD" \
  --quiet || echo "  (déjà existant)"

CLOUDSQL_INSTANCE="$PROJECT_ID:$REGION:$DB_INSTANCE"
DATABASE_URL="postgresql+asyncpg://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=/cloudsql/$CLOUDSQL_INSTANCE"

# ── 5. Secret Manager ─────────────────────────────────────────────────────────
echo "▶ Création des secrets dans Secret Manager..."

create_secret() {
  local name="$1"
  local value="$2"
  echo -n "$value" | gcloud secrets create "$name" --data-file=- --quiet 2>/dev/null || \
  echo -n "$value" | gcloud secrets versions add "$name" --data-file=- --quiet
}

create_secret "DATABASE_URL"    "$DATABASE_URL"
create_secret "JWT_SECRET"      "$(openssl rand -base64 32)"
create_secret "NEXTAUTH_SECRET" "$(openssl rand -base64 32)"
create_secret "ENCRYPTION_KEY"  "$(python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())')"

echo ""
echo "  ⚠️  Secrets à créer MANUELLEMENT (valeurs issues de Google Cloud Console) :"
echo "     echo -n 'your-client-id'     | gcloud secrets create GOOGLE_CLIENT_ID     --data-file=-"
echo "     echo -n 'your-client-secret' | gcloud secrets create GOOGLE_CLIENT_SECRET  --data-file=-"

# ── 6. Service account Cloud Run ──────────────────────────────────────────────
echo "▶ Configuration service account Cloud Run..."
SA_EMAIL="$SERVICE_NAME@$PROJECT_ID.iam.gserviceaccount.com"

gcloud iam service-accounts create "$SERVICE_NAME" \
  --display-name="ExScript Cloud Run SA" --quiet || echo "  (déjà existant)"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client" --quiet

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor" --quiet

# ── 7. Cloud Build trigger GitHub ─────────────────────────────────────────────
echo ""
echo "▶ Connexion GitHub → Cloud Build :"
echo "  → Va sur : https://console.cloud.google.com/cloud-build/triggers;region=$REGION"
echo "  → 'Connect repository' → GitHub → $GITHUB_OWNER/$GITHUB_REPO"
echo "  → Puis crée le trigger sur la branche 'main' :"
echo ""
echo "  gcloud builds triggers create github \\"
echo "    --region=$REGION \\"
echo "    --repo-name=$GITHUB_REPO \\"
echo "    --repo-owner=$GITHUB_OWNER \\"
echo "    --branch-pattern='^main$' \\"
echo "    --build-config=cloudbuild.yaml \\"
echo "    --name=exscript-deploy \\"
echo "    --substitutions=_REGION=$REGION,_REPO=$REPO_NAME,_SERVICE=exscript,_FRONTEND_SERVICE=exscript-frontend,_CLOUDSQL_INSTANCE=$CLOUDSQL_INSTANCE"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Infrastructure GCP prête !"
echo ""
echo "  PROJECT_ID        : $PROJECT_ID"
echo "  REGION            : $REGION"
echo "  Cloud SQL         : $CLOUDSQL_INSTANCE"
echo "  Artifact Registry : $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"
echo "  Service account   : $SA_EMAIL"
echo "  DB password       : $DB_PASSWORD  ← SAUVEGARDER"
echo ""
echo "  Prochaines étapes :"
echo "  1. Créer les secrets GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET"
echo "  2. Connecter le repo GitHub à Cloud Build (voir ci-dessus)"
echo "  3. Lancer un premier build → noter les URLs Cloud Run"
echo "  4. Ajouter l'URL du frontend comme Authorized redirect URI dans Google Console"
echo "════════════════════════════════════════════════════════"
