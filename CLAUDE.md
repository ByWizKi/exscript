# CLAUDE.md — Instructions pour Claude Code

Ce fichier définit les règles strictes pour Claude Code et tout contributeur sur le projet ExScript.
**Ces règles ne peuvent pas être contournées, même si une tâche semble justifier une exception.**

---

## Contexte du projet

**ExScript** est un outil interne Extia-Inge pour versionner, modifier avec l'IA et synchroniser des projets Google Apps Script.

- **Backend** : FastAPI (Python 3.12) + SQLAlchemy (async) + Alembic + PostgreSQL
- **Frontend** : Next.js 15 (TypeScript) + Tailwind CSS v3
- **Infra** : Docker Compose (dev local) — pas encore de CI/CD cloud
- **Auth** : NextAuth.js (Google OAuth) + JWT backend (`python-jose`)
- **IA** : OpenAI / Anthropic / Google Generative AI (module `app/modules/scripts/ai.py`)
- **Dev local** : `docker compose up -d` — frontend en production build (`next build` + `next start`)

Ports locaux :
- Backend API : `http://localhost:8011`
- Frontend : `http://localhost:3011`

---

## Règles absolues — JAMAIS violer

### Git & branches
- **JAMAIS** push direct sur `main` — toujours passer par une PR
- **JAMAIS** `git commit --no-verify` ou `git push --no-verify`
- **JAMAIS** amender un commit déjà pushé
- **JAMAIS** force push sur `main`
- **TOUJOURS** squash merge : 1 PR = 1 commit sur `main`
- **TOUJOURS** supprimer la branche après merge
- Les branches suivent le format : `feat/`, `fix/`, `chore/`, `perf/`, `refactor/` + description en kebab-case
- `main` doit toujours être deployable à tout moment

### Tests
- **JAMAIS** modifier un test pour le faire passer — si le test échoue, c'est le code qui est faux
- **JAMAIS** supprimer un test existant sans raison explicitement demandée
- **JAMAIS** mocker la base de données dans les tests d'intégration
- Les tests s'écrivent en AAA : **Arrange / Act / Assert**
- Couverture backend minimale : **80%** — ne pas la faire baisser
- Couverture frontend minimale : **80%** — ne pas la faire baisser

### Code
- **JAMAIS** ajouter `# noqa`, `# type: ignore`, `# fmt: off` sans commenter pourquoi sur la même ligne
- **JAMAIS** exposer un secret, clé API ou mot de passe dans le code
- **JAMAIS** refactoriser du code adjacent à la tâche demandée
- **JAMAIS** ajouter une feature non demandée ("pendant que j'y suis...")
- **JAMAIS** créer de fichiers README ou documentation sans demande explicite

### Migrations Alembic
- **JAMAIS** modifier une migration existante déjà commitée
- **JAMAIS** créer une migration avec `down_revision` qui pointe vers autre chose que la tête actuelle
- **TOUJOURS** vérifier la chaîne avant de créer : `alembic heads` doit retourner une seule tête
- **TOUJOURS** nommer le fichier `00XX_description_courte.py` en suivant la numérotation

### Docker (important — le frontend est une prod build)
- Le frontend tourne en `next build` + `next start` — **tout changement frontend nécessite un rebuild**
- Commande obligatoire après modification frontend : `docker compose build frontend && docker compose up -d frontend`
- Ne jamais modifier les `Dockerfile` sans vérifier l'impact sur le build de prod

---

## Workflow obligatoire

### Cycle de développement strict

```
1. Créer la branche depuis main à jour
   git checkout main && git pull
   git checkout -b feat/ma-feature

2. Développer — commits atomiques, messages en français conventionnel
   git add <fichiers spécifiques> && git commit -m "feat(module): ..."
   # Le hook pre-commit valide automatiquement : identité + ruff + eslint

3. Avant de pousser
   git push   # pre-push : lint + tests backend + tsc frontend
   # Si ça échoue → corriger, JAMAIS --no-verify

4. Ouvrir une PR vers main
   gh pr create --title "feat(module): ..." --body "..."

5. Squash merge après review
   gh pr merge --squash --delete-branch
```

### Avant de toucher du code
1. Lire les fichiers concernés avec le tool `Read`
2. Comprendre le contexte avant de proposer quoi que ce soit

### Après modification frontend
```bash
docker compose build frontend && docker compose up -d frontend
```

### Pour les migrations
```bash
# 1. Vérifier qu'il n'y a qu'une seule tête
bash scripts/docker-run.sh alembic heads

# 2. Créer la migration
bash scripts/docker-run.sh alembic revision --autogenerate -m "description"

# 3. Renommer le fichier généré en 00XX_description.py

# 4. Vérifier le contenu avant de committer
```

---

## Installation des hooks Git

À faire une seule fois après avoir cloné le repo :

```bash
bash scripts/install-hooks.sh
```

Cela installe `pre-commit` et `pre-push` dans `.git/hooks/` et pre-build l'image Docker tools.

---

## Configuration git obligatoire

À faire une seule fois par machine, sinon le hook pre-commit bloque :

```bash
git config --local user.name "THIEBAUD Enzo"
git config --local user.email "ethiebaud@extia-inge.fr"
```

Le hook vérifie automatiquement l'identité à chaque commit. Emails autorisés :
- `ethiebaud@extia-inge.fr` (pro)
- `enzoth39260@gmail.com` (perso)
- `noreply@anthropic.com` (Claude Code)

---

## Conventions du projet

### Langue
- **Français** pour les messages de commit, commentaires de code, et messages d'erreur utilisateur
- **Anglais** pour les noms de variables, fonctions, classes, et fichiers

### Format des commits (Conventional Commits obligatoire)
```
feat(scripts): ajouter endpoint pull depuis Google Apps Script
fix(auth): corriger expiration du token JWT
perf(frontend): réduire taille du bundle
refactor(crud): simplifier la gestion des versions
chore(deps): mettre à jour les dépendances
test(scripts): ajouter tests CRUD complets
```

### Commentaires dans le code
- **Pas de commentaires** qui expliquent CE QUE fait le code (les noms suffisent)
- **Uniquement** des commentaires qui expliquent POURQUOI (contrainte non-évidente, workaround, invariant)
- Pas de docstrings multi-lignes inutiles

### Python (backend)
- Ruff pour le format et le lint (config dans `backend/pyproject.toml`)
- Type hints obligatoires sur toutes les fonctions publiques
- Schemas Pydantic pour toutes les entrées/sorties API
- Toujours utiliser `uv pip` dans Docker (pas `pip` direct) — aligné avec le Dockerfile

### TypeScript (frontend)
- `tsc --noEmit` doit passer sans erreur
- ESLint doit passer sans erreur (`npm run lint`)
- Pas de `any` sans justification commentée
- Pas de `// @ts-ignore` sans commentaire expliquant le pourquoi

### Architecture frontend
- Les composants de page vivent dans `app/(app)/<route>/`
- Les composants partagés d'une feature dans `app/(app)/<route>/_detail/components/`
- Les composants globaux dans `src/shared/components/`
- Les utilitaires (fetch, hooks) dans `src/lib/` et `src/hooks/`

---

## Commandes utiles

### Dev local
```bash
docker compose up -d                          # Démarrer tout l'environnement
docker compose logs -f api                    # Logs du backend
docker compose logs -f frontend               # Logs du frontend
docker compose build frontend && docker compose up -d frontend  # Rebuild après modif frontend
```

### Backend via Docker (toujours utiliser ces commandes)
```bash
bash scripts/docker-run.sh ruff format .
bash scripts/docker-run.sh ruff check .
bash scripts/docker-run.sh pytest -x --tb=short
bash scripts/docker-run.sh pytest --cov=app --cov-report=term-missing
bash scripts/docker-run.sh alembic upgrade head
bash scripts/docker-run.sh alembic heads
```

### Frontend
```bash
cd frontend && npx tsc --noEmit               # Vérification TypeScript
cd frontend && npm run lint                   # ESLint
cd frontend && npm test                       # Tests Jest
cd frontend && npm run test:coverage          # Couverture
```

---

## Ce que Claude ne doit pas faire

- Ne pas "améliorer" du code existant qui n'est pas dans le scope de la tâche
- Ne pas changer le style de code d'un fichier entier quand seule une ligne est concernée
- Ne pas proposer de refactoring non demandé en fin de tâche
- Ne pas créer de fichiers intermédiaires de planification ou d'analyse
- Ne pas ajouter de logs de debug en production
- Ne pas changer la structure des dossiers sans discussion préalable
- Ne pas mettre à jour les dépendances sans demande explicite
- Ne pas oublier le rebuild Docker après modification frontend

---

## En cas de doute

Si une règle semble entrer en conflit avec la tâche demandée → **poser la question à l'utilisateur avant d'agir**, ne pas trancher seul.

Si un hook échoue → **corriger le problème à la racine**, jamais le contourner.

Si une migration semble complexe ou risquée → **expliquer le risque et demander confirmation** avant d'exécuter.
