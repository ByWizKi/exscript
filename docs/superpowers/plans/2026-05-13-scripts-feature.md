# Scripts Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d'ajouter et lister des projets Google Apps Script (nom + gas_script_id + spreadsheet_id) avec versioning complet des fichiers source.

**Architecture:** Le backend FastAPI expose des endpoints CRUD pour `scripts`, `script_versions` et `script_files`. SQLAlchemy crée les tables au démarrage via `Base.metadata.create_all`. Le frontend Next.js affiche la liste des scripts et un modal pour ajouter un projet complet (métadonnées + fichiers de la version initiale).

**Tech Stack:** FastAPI, SQLAlchemy async, PostgreSQL, Next.js 15 App Router, Tailwind CSS, design system Extia (couleurs ExRef)

---

## File Map

```
backend/app/
├── db/models/
│   └── script.py          # Script, ScriptVersion, ScriptFile models
├── modules/scripts/
│   ├── __init__.py
│   ├── router.py          # GET /scripts, POST /scripts, GET /scripts/{id}
│   ├── schemas.py         # Pydantic I/O
│   └── service.py         # logique métier (create, list, get)

frontend/src/app/(app)/
├── scripts/
│   └── page.tsx           # Page Scripts (liste + bouton Add)
└── components/
    └── scripts/
        ├── ScriptCard.tsx       # Carte d'un script dans la liste
        └── AddScriptModal.tsx   # Modal ajout projet (étape 1: meta, étape 2: fichiers)
```

---

## Task 1 : Backend — modèles DB

**Files:**
- Create: `backend/app/db/models/script.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1 : Créer `backend/app/db/models/script.py`**

```python
from __future__ import annotations
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
import enum
from app.db.session import Base


class ScriptStatus(str, enum.Enum):
    draft = "draft"
    tested = "tested"
    deployed = "deployed"


class Script(Base):
    __tablename__ = "scripts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    gas_script_id: Mapped[str] = mapped_column(String(255))
    spreadsheet_id: Mapped[str] = mapped_column(String(255))
    owner_email: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    versions: Mapped[list[ScriptVersion]] = relationship(
        back_populates="script", cascade="all, delete-orphan", order_by="ScriptVersion.version_number"
    )


class ScriptVersion(Base):
    __tablename__ = "script_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    script_id: Mapped[int] = mapped_column(ForeignKey("scripts.id", ondelete="CASCADE"))
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    message: Mapped[str] = mapped_column(String(500), default="Version initiale")
    status: Mapped[ScriptStatus] = mapped_column(SAEnum(ScriptStatus), default=ScriptStatus.draft)
    created_by: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    script: Mapped[Script] = relationship(back_populates="versions")
    files: Mapped[list[ScriptFile]] = relationship(
        back_populates="version", cascade="all, delete-orphan"
    )


class ScriptFile(Base):
    __tablename__ = "script_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("script_versions.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    file_type: Mapped[str] = mapped_column(String(50), default="server_js")

    version: Mapped[ScriptVersion] = relationship(back_populates="files")
```

- [ ] **Step 2 : Importer le modèle dans `backend/app/main.py` pour que `create_all` le détecte**

Ajouter après les imports existants dans `backend/app/main.py` :

```python
from app.db.models import script as _script_models  # noqa: F401 — force SQLAlchemy registration
```

Et ajouter le router scripts :

```python
from app.modules.scripts.router import router as scripts_router
# ...dans l'app après auth_router :
app.include_router(scripts_router, prefix="/scripts")
```

Le fichier complet `backend/app/main.py` :

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.session import engine, Base
from app.modules.auth.router import router as auth_router
from app.modules.scripts.router import router as scripts_router
import app.db.models.script as _script_models  # noqa: F401
import app.db.models.user as _user_models  # noqa: F401


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
app.include_router(scripts_router, prefix="/scripts")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

- [ ] **Step 3 : Créer `backend/app/modules/scripts/__init__.py`** (fichier vide)

- [ ] **Step 4 : Commit**

```bash
git add backend/
git commit -m "feat(backend): Script, ScriptVersion, ScriptFile models"
```

---

## Task 2 : Backend — schemas + service + router

**Files:**
- Create: `backend/app/modules/scripts/schemas.py`
- Create: `backend/app/modules/scripts/service.py`
- Create: `backend/app/modules/scripts/router.py`

- [ ] **Step 1 : Créer `backend/app/modules/scripts/schemas.py`**

```python
from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime


class ScriptFileIn(BaseModel):
    filename: str
    content: str
    file_type: str = "server_js"


class ScriptFileOut(BaseModel):
    id: int
    filename: str
    content: str
    file_type: str

    model_config = {"from_attributes": True}


class ScriptVersionOut(BaseModel):
    id: int
    version_number: int
    message: str
    status: str
    created_by: str
    created_at: datetime
    files: list[ScriptFileOut] = []

    model_config = {"from_attributes": True}


class ScriptCreate(BaseModel):
    name: str
    gas_script_id: str
    spreadsheet_id: str
    files: list[ScriptFileIn]
    version_message: str = "Version initiale"


class ScriptOut(BaseModel):
    id: int
    name: str
    gas_script_id: str
    spreadsheet_id: str
    owner_email: str
    created_at: datetime
    latest_version: ScriptVersionOut | None = None

    model_config = {"from_attributes": True}


class ScriptListItem(BaseModel):
    id: int
    name: str
    gas_script_id: str
    spreadsheet_id: str
    owner_email: str
    created_at: datetime
    version_count: int
    latest_status: str | None

    model_config = {"from_attributes": True}
```

- [ ] **Step 2 : Créer `backend/app/modules/scripts/service.py`**

```python
from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.models.script import Script, ScriptVersion, ScriptFile
from .schemas import ScriptCreate


async def create_script(data: ScriptCreate, owner_email: str, db: AsyncSession) -> Script:
    script = Script(
        name=data.name,
        gas_script_id=data.gas_script_id,
        spreadsheet_id=data.spreadsheet_id,
        owner_email=owner_email,
    )
    db.add(script)
    await db.flush()  # get script.id

    version = ScriptVersion(
        script_id=script.id,
        version_number=1,
        message=data.version_message,
        created_by=owner_email,
    )
    db.add(version)
    await db.flush()  # get version.id

    for f in data.files:
        db.add(ScriptFile(
            version_id=version.id,
            filename=f.filename,
            content=f.content,
            file_type=f.file_type,
        ))

    await db.commit()
    await db.refresh(script)
    return script


async def list_scripts(db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(
            Script,
            func.count(ScriptVersion.id).label("version_count"),
        )
        .outerjoin(ScriptVersion, ScriptVersion.script_id == Script.id)
        .group_by(Script.id)
        .order_by(Script.created_at.desc())
    )
    rows = result.all()

    scripts = []
    for row in rows:
        script = row[0]
        version_count = row[1]
        # get latest version status
        latest = await db.execute(
            select(ScriptVersion)
            .where(ScriptVersion.script_id == script.id)
            .order_by(ScriptVersion.version_number.desc())
            .limit(1)
        )
        latest_version = latest.scalar_one_or_none()
        scripts.append({
            "id": script.id,
            "name": script.name,
            "gas_script_id": script.gas_script_id,
            "spreadsheet_id": script.spreadsheet_id,
            "owner_email": script.owner_email,
            "created_at": script.created_at,
            "version_count": version_count,
            "latest_status": latest_version.status.value if latest_version else None,
        })
    return scripts


async def get_script(script_id: int, db: AsyncSession) -> Script | None:
    result = await db.execute(
        select(Script).where(Script.id == script_id)
    )
    script = result.scalar_one_or_none()
    if not script:
        return None

    # load latest version with files
    ver_result = await db.execute(
        select(ScriptVersion)
        .where(ScriptVersion.script_id == script_id)
        .order_by(ScriptVersion.version_number.desc())
        .limit(1)
    )
    latest = ver_result.scalar_one_or_none()
    if latest:
        files_result = await db.execute(
            select(ScriptFile).where(ScriptFile.version_id == latest.id)
        )
        latest.files = list(files_result.scalars().all())
        script.versions = [latest]

    return script
```

- [ ] **Step 3 : Créer `backend/app/modules/scripts/router.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .schemas import ScriptCreate, ScriptOut, ScriptListItem
from .service import create_script, list_scripts, get_script

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def get_current_email(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = decode_access_token(credentials.credentials)
    return payload["sub"]


@router.get("", response_model=list[ScriptListItem])
async def list_scripts_endpoint(
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    return await list_scripts(db)


@router.post("", response_model=ScriptOut, status_code=201)
async def create_script_endpoint(
    body: ScriptCreate,
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    script = await create_script(body, email, db)
    return await get_script(script.id, db)


@router.get("/{script_id}", response_model=ScriptOut)
async def get_script_endpoint(
    script_id: int,
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    script = await get_script(script_id, db)
    if not script:
        raise HTTPException(status_code=404, detail="Script non trouvé")
    return script
```

- [ ] **Step 4 : Commit**

```bash
git add backend/app/modules/scripts/
git commit -m "feat(backend): scripts CRUD endpoints with versioning"
```

---

## Task 3 : Frontend — page Scripts (liste)

**Files:**
- Create: `frontend/src/app/(app)/scripts/page.tsx`
- Create: `frontend/src/app/(app)/scripts/components/ScriptCard.tsx`

- [ ] **Step 1 : Créer `frontend/src/app/(app)/scripts/components/ScriptCard.tsx`**

```tsx
import { Code2, Sheet, GitBranch, Clock } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  draft:    "bg-white/10 text-white/60 border-white/20",
  tested:   "bg-extia-green/20 text-extia-green border-extia-green/30",
  deployed: "bg-extia-yellow/20 text-extia-yellow border-extia-yellow/30",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", tested: "Testé", deployed: "Déployé",
};

interface Props {
  script: {
    id: number;
    name: string;
    gas_script_id: string;
    spreadsheet_id: string;
    version_count: number;
    latest_status: string | null;
    created_at: string;
  };
}

export function ScriptCard({ script }: Props) {
  const status = script.latest_status ?? "draft";
  return (
    <div className="group bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 bg-white border-slate-200 rounded-2xl p-5 hover:border-extia-yellow/30 transition-all duration-200 hover:shadow-lg hover:shadow-extia-yellow/5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-extia-yellow/10 flex items-center justify-center">
            <Code2 className="h-5 w-5 text-extia-yellow" />
          </div>
          <div>
            <h3 className="font-semibold text-extia-night dark:text-white text-sm">{script.name}</h3>
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border mt-1 ${STATUS_STYLE[status]}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-white/40 dark:text-white/40 text-slate-400">
          <GitBranch className="h-4 w-4" />
          <span className="text-xs">{script.version_count}v</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/50 dark:text-white/50 text-slate-500">
          <Code2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-mono truncate">{script.gas_script_id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50 dark:text-white/50 text-slate-500">
          <Sheet className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-mono truncate">{script.spreadsheet_id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40 dark:text-white/40 text-slate-400">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{new Date(script.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Créer `frontend/src/app/(app)/scripts/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { ScriptCard } from "./components/ScriptCard";
import { AddScriptModal } from "./components/AddScriptModal";

interface ScriptListItem {
  id: number;
  name: string;
  gas_script_id: string;
  spreadsheet_id: string;
  version_count: number;
  latest_status: string | null;
  created_at: string;
}

export default function ScriptsPage() {
  const { data: session } = useSession();
  const [scripts, setScripts] = useState<ScriptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchScripts = async () => {
    if (!session?.backendToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`, {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      });
      if (res.ok) setScripts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScripts(); }, [session]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-black text-2xl text-extia-night dark:text-white">
            <span className="text-extia-yellow">Scripts</span> GAS
          </h1>
          <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
            {scripts.length} projet{scripts.length !== 1 ? "s" : ""} enregistré{scripts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover text-extia-night font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter un projet
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-extia-yellow/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📜</span>
          </div>
          <p className="text-extia-night dark:text-white font-semibold mb-1">Aucun script</p>
          <p className="text-slate-500 dark:text-white/40 text-sm mb-6">Ajoutez votre premier projet GAS</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter un projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {scripts.map((s) => <ScriptCard key={s.id} script={s} />)}
        </div>
      )}

      {showModal && (
        <AddScriptModal
          token={session?.backendToken ?? ""}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchScripts(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3 : Commit**

```bash
git add frontend/src/app/\(app\)/scripts/
git commit -m "feat(frontend): scripts list page with ScriptCard"
```

---

## Task 4 : Frontend — Modal ajout projet (2 étapes)

**Files:**
- Create: `frontend/src/app/(app)/scripts/components/AddScriptModal.tsx`

- [ ] **Step 1 : Créer `frontend/src/app/(app)/scripts/components/AddScriptModal.tsx`**

```tsx
"use client";

import { useState } from "react";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

interface FileEntry { filename: string; content: string; file_type: string }

interface Props {
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

const FILE_TYPES = [
  { value: "server_js", label: "JavaScript (.js)" },
  { value: "html",      label: "HTML (.html)" },
  { value: "json",      label: "JSON (appsscript.json)" },
];

export function AddScriptModal({ token, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [gasScriptId, setGasScriptId] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [versionMessage, setVersionMessage] = useState("Version initiale");
  const [files, setFiles] = useState<FileEntry[]>([
    { filename: "Code.js", content: "", file_type: "server_js" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFile = () =>
    setFiles((f) => [...f, { filename: "", content: "", file_type: "server_js" }]);

  const removeFile = (i: number) =>
    setFiles((f) => f.filter((_, idx) => idx !== i));

  const updateFile = (i: number, field: keyof FileEntry, value: string) =>
    setFiles((f) => f.map((file, idx) => idx === i ? { ...file, [field]: value } : file));

  const step1Valid = name.trim() && gasScriptId.trim() && spreadsheetId.trim();
  const step2Valid = files.length > 0 && files.every((f) => f.filename.trim() && f.content.trim());

  const handleSubmit = async () => {
    if (!step2Valid) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name, gas_script_id: gasScriptId, spreadsheet_id: spreadsheetId,
          version_message: versionMessage, files,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#0d1b3e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="font-heading font-black text-white text-lg">
              Ajouter un projet GAS
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              Étape {step}/2 — {step === 1 ? "Informations du projet" : "Fichiers source"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 flex-shrink-0">
          <div className="h-1 bg-extia-yellow transition-all duration-300" style={{ width: step === 1 ? "50%" : "100%" }} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">Nom du projet *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="AutomatRyma — Kickoff"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-extia-yellow focus:bg-white/8 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">Google Apps Script ID *</label>
                <input
                  value={gasScriptId}
                  onChange={(e) => setGasScriptId(e.target.value)}
                  placeholder="1BxY_abc123..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
                />
                <p className="text-white/30 text-xs mt-1">Visible dans l'URL de l'éditeur Apps Script</p>
              </div>
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">Spreadsheet ID *</label>
                <input
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="1ohFViZs2Rd9eWKTxen7..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
                />
                <p className="text-white/30 text-xs mt-1">Dans l'URL du Google Sheet : /spreadsheets/d/<strong>ID</strong>/edit</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">Message de version</label>
                <input
                  value={versionMessage}
                  onChange={(e) => setVersionMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-extia-yellow transition-colors"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-white/70 text-xs font-medium">Fichiers source *</label>
                  <button
                    onClick={addFile}
                    className="flex items-center gap-1 text-extia-yellow hover:text-extia-yellow-hover text-xs font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter un fichier
                  </button>
                </div>

                {files.map((file, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        value={file.filename}
                        onChange={(e) => updateFile(i, "filename", e.target.value)}
                        placeholder="Config.js"
                        className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-extia-yellow transition-colors"
                      />
                      <select
                        value={file.file_type}
                        onChange={(e) => updateFile(i, "file_type", e.target.value)}
                        className="bg-white/5 border border-white/10 text-white/70 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-extia-yellow transition-colors"
                      >
                        {FILE_TYPES.map((t) => (
                          <option key={t.value} value={t.value} className="bg-[#0d1b3e]">{t.label}</option>
                        ))}
                      </select>
                      {files.length > 1 && (
                        <button onClick={() => removeFile(i)} className="text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={file.content}
                      onChange={(e) => updateFile(i, "content", e.target.value)}
                      placeholder="// Collez le contenu du fichier ici"
                      rows={6}
                      className="w-full bg-black/30 border border-white/10 text-white/80 placeholder-white/20 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-extia-yellow transition-colors resize-none"
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 flex-shrink-0">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Retour
            </button>
          ) : (
            <button onClick={onClose} className="text-white/50 hover:text-white text-sm transition-colors">
              Annuler
            </button>
          )}

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!step2Valid || saving}
              className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le projet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Commit**

```bash
git add frontend/src/app/\(app\)/scripts/
git commit -m "feat(frontend): AddScriptModal 2-step form (meta + files)"
```

---

## Task 5 : Rebuild Docker + vérification

- [ ] **Step 1 : Rebuild et relancer**

```bash
docker compose down && docker compose up --build -d
```

- [ ] **Step 2 : Vérifier le backend**

```bash
curl http://localhost:8011/health
# {"status":"ok"}

curl http://localhost:8011/scripts \
  -H "Authorization: Bearer <token_jwt>"
# []
```

- [ ] **Step 3 : Vérifier la page**

Ouvrir `http://localhost:3011/scripts` → page vide avec bouton "Ajouter un projet"
Cliquer → modal en 2 étapes s'ouvre
Remplir étape 1 (nom, script ID, sheet ID) → Suivant
Remplir étape 2 (fichiers) → Créer le projet
Vérifier que la carte apparaît dans la liste

- [ ] **Step 4 : Commit final**

```bash
git add .
git commit -m "chore: scripts feature complete"
```
