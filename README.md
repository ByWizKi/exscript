# ExScript

A full-stack web application for managing Google Sheets scripts with AI-powered modifications and version control.

## Overview

ExScript allows users to:
- Import and manage Google Sheets scripts
- Get AI-powered suggestions for script modifications
- Review diffs before applying changes
- Maintain version history
- Push changes back to Google Sheets

Built with FastAPI (backend), Next.js 15 (frontend), PostgreSQL, and modern AI providers (OpenAI, Anthropic, Gemini).

## Prerequisites

- **Docker & Docker Compose** (recommended for quick setup)
- **Node.js** 18+ (for local frontend development)
- **Python** 3.12+ (for local backend development)
- **PostgreSQL** 16+ (if running backend outside Docker)

### API Requirements

You'll need credentials for:
- **Google OAuth**: https://console.cloud.google.com
- **LLM Provider** (one of):
  - OpenAI API key: https://platform.openai.com
  - Anthropic API key: https://console.anthropic.com
  - Gemini API key: https://ai.google.dev
  - Ollama (local, no key needed)

## Quick Start (with Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd ExScript

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add your Google OAuth credentials and LLM API key

# 3. Start all services
docker compose up

# Services will be available at:
# Frontend:   http://localhost:3011
# API:        http://localhost:8011
# API Docs:   http://localhost:8011/docs
# DB:         localhost:5435
```

The backend will automatically create the database schema on startup.

## Development Setup (without Docker)

### Backend

```bash
# 1. Create virtual environment
cd backend
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Install dependencies
pip install uv
uv pip install -e ".[dev]"

# 3. Set up database
# Create a local PostgreSQL database, or use Docker just for DB:
docker run -d \
  --name exscript-db \
  -e POSTGRES_USER=exscript \
  -e POSTGRES_PASSWORD=exscript \
  -e POSTGRES_DB=exscript \
  -p 5435:5432 \
  postgres:16

# 4. Create .env and set DATABASE_URL
cat > ../.env << EOF
DATABASE_URL=postgresql+asyncpg://exscript:exscript@localhost:5435/exscript
JWT_SECRET=$(openssl rand -base64 32)
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
GOOGLE_CLIENT_ID=your-client-id
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_API_URL=http://localhost:8011
EOF

# 5. Start the API server
uvicorn app.main:app --reload --port 8011
```

### Frontend

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Create .env.local (or use the main .env)
export NEXT_PUBLIC_API_URL=http://localhost:8011

# 3. Start the dev server
npm run dev
# Available at http://localhost:3011
```

## Project Structure

```
ExScript/
├── backend/                          # FastAPI application
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry point
│   │   ├── core/
│   │   │   └── config.py             # Settings & configuration
│   │   ├── db/
│   │   │   ├── session.py            # SQLAlchemy setup
│   │   │   └── models/               # ORM models
│   │   ├── llm/                      # LLM provider implementations
│   │   │   ├── anthropic_provider.py
│   │   │   ├── gemini_provider.py
│   │   │   ├── openai_provider.py
│   │   │   └── factory.py
│   │   └── modules/                  # Feature modules
│   │       ├── auth/                 # Authentication
│   │       ├── scripts/              # Script management
│   │       ├── google/               # Google Sheets integration
│   │       └── settings/             # LLM settings
│   ├── pyproject.toml                # Python dependencies
│   └── Dockerfile
│
├── frontend/                         # Next.js 15 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (app)/
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── scripts/          # Scripts list & detail
│   │   │   │   └── settings/         # Settings page
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── auth.ts               # NextAuth configuration
│   │   └── hooks/                    # React hooks
│   ├── package.json
│   ├── next.config.ts
│   └── Dockerfile
│
├── docker-compose.yml                # Multi-container setup
├── .env.example                      # Environment variables template
└── README.md                         # This file
```

## Available Scripts

### Backend

```bash
# Start development server with reload
uvicorn app.main:app --reload

# Run tests
pytest

# Run linting
ruff check app/

# Type checking
mypy app/
```

### Frontend

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## API Documentation

**OpenAPI/Swagger UI** (auto-generated):
- Available at: `http://localhost:8011/docs`
- In production (ENVIRONMENT=production): disabled

**ReDoc** (alternative API docs):
- Available at: `http://localhost:8011/redoc`
- In production: disabled

### Key Endpoints

- `GET /health` — Health check
- `POST /auth/login` — User authentication
- `GET /scripts` — List user's scripts
- `POST /scripts` — Create new script
- `GET /scripts/{id}` — Get script details
- `POST /scripts/{id}/ai-modify` — Get AI modification suggestions
- `POST /scripts/{id}/push` — Push changes to Google Sheets
- `GET /scripts/{id}/versions` — Get version history
- `GET /settings/llm` — Get LLM settings
- `PUT /settings/llm` — Update LLM settings
- `GET /google/auth-url` — Start Google OAuth flow

## Environment Variables

See `.env.example` for all available variables. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENVIRONMENT` | `development` | Set to `production` to disable API docs |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `JWT_SECRET` | - | Secret for signing JWT tokens |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `NEXTAUTH_SECRET` | - | Secret for NextAuth session tokens |
| `NEXT_PUBLIC_API_URL` | - | API URL (exposed to frontend) |
| `INTERNAL_API_URL` | - | API URL for server-side calls (Docker only) |

## Deployment

### Production Environment

1. Set `ENVIRONMENT=production` in `.env` (disables API docs)
2. Generate strong secrets:
   ```bash
   openssl rand -base64 32
   ```
3. Use PostgreSQL managed database service
4. Deploy via Docker or Kubernetes

### Docker Compose (Production)

```bash
docker compose -f docker-compose.yml up -d
```

## Troubleshooting

### Port already in use
- Frontend: Change port in `frontend/next.config.ts` or kill process on 3011
- Backend: Change port in `docker-compose.yml` or kill process on 8011
- Database: Kill process on 5435 or change in `docker-compose.yml`

### Database connection errors
- Ensure PostgreSQL is running and healthy
- Check `DATABASE_URL` format: `postgresql+asyncpg://user:pass@host:port/db`
- Wait for database to be ready: `docker compose logs db`

### Frontend can't reach API
- Check `NEXT_PUBLIC_API_URL` is set correctly
- Frontend uses `NEXT_PUBLIC_API_URL` for client-side calls
- Server-side calls use `INTERNAL_API_URL` (Docker only)
- Backend CORS must allow frontend origin

### Google OAuth issues
- Verify credentials in Google Cloud Console
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Ensure `NEXTAUTH_URL` matches your deployment domain
- Check authorized redirect URIs in OAuth app settings

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy, AsyncIO
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL 16, SQLAlchemy async
- **Auth**: NextAuth.js 5 (beta), JWT
- **LLM**: OpenAI, Anthropic, Google Gemini
- **Deployment**: Docker, Docker Compose

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Add your license here]

## Support

For issues, questions, or suggestions, please open an issue on GitHub or contact the team.
