# ExScript — Login Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold ExScript (frontend Next.js 15 + backend FastAPI + PostgreSQL) avec une page de connexion Google OAuth restreinte au domaine @extia-inge.fr.

**Architecture:** Le frontend Next.js (port 3011) utilise NextAuth v5 pour le flow Google OAuth. Après authentification Google, le backend FastAPI (port 8011) valide le token, vérifie que l'email se termine par `@extia-inge.fr`, crée/met à jour l'utilisateur en DB et retourne un JWT signé. Les routes protégées vérifient le JWT via middleware Next.js.

**Tech Stack:** Next.js 15 (App Router), NextAuth v5, FastAPI, SQLAlchemy async, PostgreSQL 16, Docker Compose, Tailwind CSS, Montserrat font

---

## File Map

```
ExScript/
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx              # Root layout (fonts, providers)
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # Page login Google
│   │   │   └── access-denied/
│   │   │       └── page.tsx            # Page refus domaine
│   │   ├── auth.ts                     # NextAuth config (Google provider)
│   │   ├── middleware.ts               # Protect routes
│   │   └── lib/
│   │       └── api.ts                  # Fetch helper vers backend
└── backend/
    ├── Dockerfile
    ├── pyproject.toml
    ├── app/
    │   ├── main.py                     # FastAPI app
    │   ├── core/
    │   │   ├── config.py               # Pydantic settings
    │   │   └── security.py             # JWT sign/verify
    │   ├── db/
    │   │   ├── session.py              # SQLAlchemy async engine
    │   │   ├── models/
    │   │   │   └── user.py             # User model
    │   │   └── migrations/             # Alembic
    │   └── modules/
    │       └── auth/
    │           ├── router.py           # POST /auth/google
    │           ├── schemas.py          # Pydantic I/O
    │           └── service.py          # Domain check + upsert user
```

---

## Task 1 : Docker Compose + structure projet

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `frontend/Dockerfile`
- Create: `backend/Dockerfile`

- [ ] **Step 1 : Créer docker-compose.yml**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: exscript
      POSTGRES_PASSWORD: exscript
      POSTGRES_DB: exscript
    ports:
      - "5434:5432"
    volumes:
      - exscript_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U exscript"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./backend
    ports:
      - "8011:8011"
    env_file: .env
    environment:
      DATABASE_URL: postgresql+asyncpg://exscript:exscript@db:5432/exscript
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload

  frontend:
    build: ./frontend
    ports:
      - "3011:3011"
    env_file: .env
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - api
    environment:
      PORT: 3011

volumes:
  exscript_pgdata:
```

- [ ] **Step 2 : Créer .env.example**

```bash
# .env.example
# Google OAuth — créer sur https://console.cloud.google.com
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3011

# JWT Backend
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480

# Backend URL (utilisé par le frontend)
NEXT_PUBLIC_API_URL=http://localhost:8011
INTERNAL_API_URL=http://api:8011
```

Copier en `.env` et remplir les valeurs Google OAuth.

- [ ] **Step 3 : Créer frontend/Dockerfile**

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3011
CMD ["npm", "run", "dev"]
```

- [ ] **Step 4 : Créer backend/Dockerfile**

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install uv
COPY pyproject.toml ./
RUN uv pip install --system -e ".[dev]"
COPY . .
EXPOSE 8011
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8011", "--reload"]
```

- [ ] **Step 5 : Commit**

```bash
git add docker-compose.yml .env.example frontend/Dockerfile backend/Dockerfile
git commit -m "chore: scaffold docker-compose and Dockerfiles"
```

---

## Task 2 : Backend — scaffold FastAPI

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/main.py`
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/security.py`
- Create: `backend/app/db/session.py`
- Create: `backend/app/db/models/user.py`

- [ ] **Step 1 : Créer backend/pyproject.toml**

```toml
[project]
name = "exscript-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "asyncpg>=0.29.0",
    "alembic>=1.13.0",
    "pydantic-settings>=2.0.0",
    "python-jose[cryptography]>=3.3.0",
    "httpx>=0.27.0",
    "google-auth>=2.29.0",
]

[project.optional-dependencies]
dev = ["pytest", "pytest-asyncio", "httpx"]
```

- [ ] **Step 2 : Créer backend/app/core/config.py**

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    google_client_id: str
    allowed_domain: str = "extia-inge.fr"

    class Config:
        env_file = ".env"


settings = Settings()
```

- [ ] **Step 3 : Créer backend/app/core/security.py**

```python
# backend/app/core/security.py
from datetime import datetime, timedelta, timezone
from jose import jwt
from .config import settings


def create_access_token(data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({**data, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
```

- [ ] **Step 4 : Créer backend/app/db/session.py**

```python
# backend/app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 5 : Créer backend/app/db/models/user.py**

```python
# backend/app/db/models/user.py
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    picture: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_login: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
```

- [ ] **Step 6 : Créer backend/app/main.py**

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.session import engine, Base
from app.modules.auth.router import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="ExScript API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3011"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 7 : Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold FastAPI with config, security, db models"
```

---

## Task 3 : Backend — endpoint POST /auth/google

**Files:**
- Create: `backend/app/modules/auth/schemas.py`
- Create: `backend/app/modules/auth/service.py`
- Create: `backend/app/modules/auth/router.py`

- [ ] **Step 1 : Créer backend/app/modules/auth/schemas.py**

```python
# backend/app/modules/auth/schemas.py
from pydantic import BaseModel, EmailStr


class GoogleAuthRequest(BaseModel):
    id_token: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    email: str
    name: str
    picture: str | None

    class Config:
        from_attributes = True


AuthResponse.model_rebuild()
```

- [ ] **Step 2 : Créer backend/app/modules/auth/service.py**

```python
# backend/app/modules/auth/service.py
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.security import create_access_token
from app.db.models.user import User
from datetime import datetime, timezone


async def authenticate_google(token: str, db: AsyncSession) -> dict:
    try:
        info = id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Google invalide")

    email: str = info.get("email", "")
    domain = email.split("@")[-1] if "@" in email else ""

    if domain != settings.allowed_domain:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Accès réservé aux emails @{settings.allowed_domain}",
        )

    # Upsert user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(email=email, name=info.get("name", ""), picture=info.get("picture"))
        db.add(user)
    else:
        user.name = info.get("name", user.name)
        user.picture = info.get("picture", user.picture)
        user.last_login = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token({"sub": user.email, "name": user.name})
    return {"access_token": access_token, "user": user}
```

- [ ] **Step 3 : Créer backend/app/modules/auth/router.py**

```python
# backend/app/modules/auth/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .schemas import GoogleAuthRequest, AuthResponse, UserOut
from .service import authenticate_google

router = APIRouter()


@router.post("/google", response_model=AuthResponse)
async def google_login(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    result = await authenticate_google(body.id_token, db)
    return AuthResponse(
        access_token=result["access_token"],
        user=UserOut.model_validate(result["user"]),
    )
```

- [ ] **Step 4 : Commit**

```bash
git add backend/app/modules/
git commit -m "feat(backend): Google OAuth endpoint with domain restriction"
```

---

## Task 4 : Frontend — scaffold Next.js 15

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/app/layout.tsx`

- [ ] **Step 1 : Initialiser le projet Next.js**

Dans le dossier `frontend/`, lancer :
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Ensuite installer les dépendances supplémentaires :
```bash
npm install next-auth@beta
```

- [ ] **Step 2 : Mettre à jour next.config.ts**

```typescript
// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3 : Mettre à jour tailwind.config.ts avec les couleurs Extia**

```typescript
// frontend/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        extia: {
          yellow: "#FFD500",
          "yellow-hover": "#E6C000",
          night: "#001441",
          blue: {
            light: "#9BAFD0",
            mid: "#4379B3",
            dark: "#1D578C",
          },
          green: "#8DBC6A",
          cyan: "#56C3C3",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        mont: ["Mont Heavy", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4 : Créer frontend/src/app/layout.tsx**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ExScript — Extia Ingénierie",
  description: "Configurateur Google Apps Script",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${montserrat.variable} font-sans bg-extia-night min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5 : Mettre à jour globals.css**

```css
/* frontend/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
}
```

- [ ] **Step 6 : Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Next.js 15 with Extia design system"
```

---

## Task 5 : Frontend — NextAuth config + middleware

**Files:**
- Create: `frontend/src/auth.ts`
- Create: `frontend/src/middleware.ts`
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1 : Créer frontend/src/auth.ts**

```typescript
// frontend/src/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/access-denied",
  },
  callbacks: {
    async signIn({ account }) {
      // Le vrai check domaine se fait côté backend via id_token
      return !!account?.id_token;
    },
    async jwt({ token, account }) {
      if (account?.id_token) {
        // Envoyer le token au backend pour validation domaine + get JWT
        const res = await fetch(
          `${process.env.INTERNAL_API_URL}/auth/google`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          }
        );

        if (!res.ok) {
          // Domaine non autorisé
          token.error = "AccessDenied";
          return token;
        }

        const data = await res.json();
        token.backendToken = data.access_token;
        token.user = data.user;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error === "AccessDenied") {
        throw new Error("AccessDenied");
      }
      session.backendToken = token.backendToken as string;
      session.user = token.user as typeof session.user;
      return session;
    },
  },
});
```

- [ ] **Step 2 : Créer frontend/src/middleware.ts**

```typescript
// frontend/src/middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/access-denied");

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 3 : Créer frontend/src/app/api/auth/[...nextauth]/route.ts**

```typescript
// frontend/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4 : Commit**

```bash
git add frontend/src/auth.ts frontend/src/middleware.ts frontend/src/app/api/
git commit -m "feat(frontend): NextAuth v5 Google provider with backend JWT exchange"
```

---

## Task 6 : Frontend — Page Login

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/access-denied/page.tsx`
- Create: `frontend/src/app/page.tsx` (home placeholder)

- [ ] **Step 1 : Créer frontend/src/app/login/page.tsx**

```tsx
// frontend/src/app/login/page.tsx
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-extia-night flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Titre */}
        <div className="text-center mb-10">
          <h1 className="font-mont text-extia-yellow text-4xl tracking-wide mb-2">
            ExScript
          </h1>
          <p className="text-extia-blue-light text-sm font-medium">
            Configurateur Google Apps Script
          </p>
          <p className="text-extia-blue-light/60 text-xs mt-1">
            Extia Ingénierie
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-white font-semibold text-xl mb-2 text-center">
            Connexion
          </h2>
          <p className="text-extia-blue-light/80 text-sm text-center mb-8">
            Réservé aux collaborateurs{" "}
            <span className="text-extia-yellow font-medium">@extia-inge.fr</span>
          </p>

          {/* Bouton Google */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-extia-yellow hover:bg-extia-yellow-hover text-extia-night font-bold py-3.5 px-6 rounded-xl transition-colors duration-200 text-sm"
            >
              <GoogleIcon />
              Se connecter avec Google
            </button>
          </form>
        </div>

        <p className="text-center text-extia-blue-light/40 text-xs mt-6">
          © {new Date().getFullYear()} Extia Ingénierie
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
```

- [ ] **Step 2 : Créer frontend/src/app/access-denied/page.tsx**

```tsx
// frontend/src/app/access-denied/page.tsx
import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-extia-night flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-extia-yellow text-6xl mb-6">⚠</div>
        <h1 className="font-mont text-white text-2xl mb-3">Accès refusé</h1>
        <p className="text-extia-blue-light text-sm mb-2">
          Votre compte Google n&apos;est pas autorisé à accéder à cette application.
        </p>
        <p className="text-extia-blue-light/60 text-xs mb-8">
          Seuls les emails{" "}
          <span className="text-extia-yellow">@extia-inge.fr</span> sont acceptés.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover text-extia-night font-bold py-2.5 px-6 rounded-xl transition-colors duration-200 text-sm"
        >
          Retour à la connexion
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3 : Créer frontend/src/app/page.tsx (placeholder home)**

```tsx
// frontend/src/app/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen bg-extia-night flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-mont text-extia-yellow text-3xl mb-4">ExScript</h1>
        <p className="text-white text-sm">
          Bienvenue,{" "}
          <span className="text-extia-yellow font-semibold">
            {session.user?.name}
          </span>{" "}
          👋
        </p>
        <p className="text-extia-blue-light/60 text-xs mt-2">{session.user?.email}</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4 : Commit**

```bash
git add frontend/src/app/
git commit -m "feat(frontend): login page, access-denied page, home placeholder"
```

---

## Task 7 : Vérification end-to-end

- [ ] **Step 1 : Copier .env et remplir les valeurs**

```bash
cp .env.example .env
# Remplir GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, JWT_SECRET
```

Pour générer les secrets :
```bash
openssl rand -base64 32
```

- [ ] **Step 2 : Lancer Docker Compose**

```bash
docker compose up --build
```

Attendre que les 3 services soient `healthy`. Vérifier :
```
✔ Container exscript-db-1       Healthy
✔ Container exscript-api-1      Started
✔ Container exscript-frontend-1 Started
```

- [ ] **Step 3 : Vérifier le backend**

```bash
curl http://localhost:8011/health
# Attendu: {"status":"ok"}
```

- [ ] **Step 4 : Tester la page login**

Ouvrir `http://localhost:3011/login`
- La page doit afficher le fond `#001441`, titre "ExScript" en jaune, bouton Google jaune
- Cliquer "Se connecter avec Google"
- Avec un compte `@extia-inge.fr` → redirigé vers `/` avec message de bienvenue
- Avec un autre compte → redirigé vers `/access-denied`

- [ ] **Step 5 : Commit final**

```bash
git add .
git commit -m "chore: add .env.example to gitignore, final setup"
```

---

## Notes de configuration Google OAuth

Dans Google Cloud Console :
1. Créer un projet → APIs & Services → Credentials → OAuth 2.0 Client ID
2. Application type : **Web application**
3. Authorized redirect URIs : `http://localhost:3011/api/auth/callback/google`
4. Copier Client ID et Client Secret dans `.env`
