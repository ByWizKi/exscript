# LLM Multi-Provider Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to modify GAS scripts via natural language prompts using any LLM provider (OpenAI, Anthropic, Gemini, Ollama), configurable from the UI.

**Architecture:** Abstract `LLMProvider` interface with one concrete class per provider. Provider + model + API key stored in a `settings` DB table, configurable via a Settings page. The AI endpoint loads all script files, sends them as context to the LLM, and returns modified files. The frontend shows a diff then creates a new version on user approval.

**Tech Stack:** FastAPI, `openai` SDK (also used for Ollama), `anthropic` SDK, `google-generativeai` SDK, Next.js 15, React diff display (CSS only, no library).

---

## File Structure

**Backend — new files:**
- `backend/app/llm/__init__.py` — empty
- `backend/app/llm/base.py` — abstract `LLMProvider` + `LLMMessage` dataclass
- `backend/app/llm/openai_provider.py` — OpenAI + Ollama (same SDK, custom base_url)
- `backend/app/llm/anthropic_provider.py` — Anthropic/Claude
- `backend/app/llm/gemini_provider.py` — Google Gemini
- `backend/app/llm/factory.py` — `get_provider(name, model, api_key, base_url?) → LLMProvider`
- `backend/app/db/models/setting.py` — `Setting` ORM model (key/value table)
- `backend/app/modules/settings/__init__.py` — empty
- `backend/app/modules/settings/router.py` — `GET/PUT /settings/llm`
- `backend/app/modules/settings/schemas.py` — `LLMSettingsOut`, `LLMSettingsIn`
- `backend/app/modules/settings/service.py` — DB read/write for settings

**Backend — modified:**
- `backend/app/modules/scripts/router.py` — add `POST /scripts/{id}/ai-modify`
- `backend/app/modules/scripts/schemas.py` — add `AIModifyRequest`, `AIModifyResponse`
- `backend/app/modules/scripts/service.py` — add `ai_modify_script()`
- `backend/app/main.py` — register settings router
- `backend/pyproject.toml` — add openai, anthropic, google-generativeai deps

**Frontend — new files:**
- `frontend/src/app/(app)/settings/page.tsx` — LLM settings form
- `frontend/src/app/(app)/scripts/[id]/page.tsx` — script detail + AI chat
- `frontend/src/app/(app)/scripts/[id]/components/FileDiff.tsx` — before/after diff display
- `frontend/src/app/(app)/scripts/[id]/components/AiChat.tsx` — prompt input + results

**Frontend — modified:**
- `frontend/src/app/(app)/layout.tsx` — add "Paramètres" nav item (icon: Settings)

---

### Task 1: Backend LLM provider abstraction + 3 providers

**Files:**
- Create: `backend/app/llm/__init__.py`
- Create: `backend/app/llm/base.py`
- Create: `backend/app/llm/openai_provider.py`
- Create: `backend/app/llm/anthropic_provider.py`
- Create: `backend/app/llm/gemini_provider.py`
- Create: `backend/app/llm/factory.py`
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Add LLM dependencies to pyproject.toml**

In `backend/pyproject.toml`, add to `dependencies`:
```toml
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
    "requests>=2.31.0",
    "openai>=1.30.0",
    "anthropic>=0.28.0",
    "google-generativeai>=0.7.0",
]
```

- [ ] **Step 2: Create `backend/app/llm/__init__.py`**

Empty file:
```python
```

- [ ] **Step 3: Create `backend/app/llm/base.py`**

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, messages: list[LLMMessage]) -> str:
        """Send messages and return the assistant's text response."""
```

- [ ] **Step 4: Create `backend/app/llm/openai_provider.py`**

```python
from __future__ import annotations
from openai import AsyncOpenAI
from .base import LLMProvider, LLMMessage


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str, base_url: str | None = None):
        self._model = model
        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url or None)

    async def complete(self, messages: list[LLMMessage]) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": m.role, "content": m.content} for m in messages],
            temperature=0,
        )
        return response.choices[0].message.content or ""
```

- [ ] **Step 5: Create `backend/app/llm/anthropic_provider.py`**

```python
from __future__ import annotations
from anthropic import AsyncAnthropic
from .base import LLMProvider, LLMMessage


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self._model = model
        self._client = AsyncAnthropic(api_key=api_key)

    async def complete(self, messages: list[LLMMessage]) -> str:
        system = next((m.content for m in messages if m.role == "system"), "")
        user_messages = [
            {"role": m.role, "content": m.content}
            for m in messages if m.role != "system"
        ]
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=8192,
            system=system,
            messages=user_messages,
        )
        return response.content[0].text
```

- [ ] **Step 6: Create `backend/app/llm/gemini_provider.py`**

```python
from __future__ import annotations
import google.generativeai as genai
from .base import LLMProvider, LLMMessage


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        genai.configure(api_key=api_key)
        self._model_name = model
        self._model = genai.GenerativeModel(model)

    async def complete(self, messages: list[LLMMessage]) -> str:
        # Combine system + user messages into a single prompt for Gemini
        parts = []
        for m in messages:
            if m.role == "system":
                parts.append(f"[System Instructions]\n{m.content}")
            elif m.role == "user":
                parts.append(f"[User]\n{m.content}")
        prompt = "\n\n".join(parts)
        response = await self._model.generate_content_async(prompt)
        return response.text
```

- [ ] **Step 7: Create `backend/app/llm/factory.py`**

```python
from __future__ import annotations
from .base import LLMProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .gemini_provider import GeminiProvider


def get_provider(name: str, model: str, api_key: str, base_url: str | None = None) -> LLMProvider:
    name = name.lower()
    if name == "openai":
        return OpenAIProvider(api_key=api_key, model=model)
    if name == "anthropic":
        return AnthropicProvider(api_key=api_key, model=model)
    if name == "gemini":
        return GeminiProvider(api_key=api_key, model=model)
    if name == "ollama":
        # Ollama is OpenAI-compatible with a local base URL
        return OpenAIProvider(
            api_key="ollama",
            model=model,
            base_url=base_url or "http://localhost:11434/v1",
        )
    raise ValueError(f"Unknown LLM provider: {name}. Supported: openai, anthropic, gemini, ollama")
```

- [ ] **Step 8: Rebuild Docker to install new packages**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
docker compose up --build -d api
docker compose logs api --tail=10
```

Expected: API starts without import errors.

- [ ] **Step 9: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add backend/app/llm/ backend/pyproject.toml
git commit -m "feat: add multi-provider LLM abstraction (OpenAI, Anthropic, Gemini, Ollama)"
```

---

### Task 2: Backend settings DB model + CRUD endpoints

**Files:**
- Create: `backend/app/db/models/setting.py`
- Create: `backend/app/modules/settings/__init__.py`
- Create: `backend/app/modules/settings/schemas.py`
- Create: `backend/app/modules/settings/service.py`
- Create: `backend/app/modules/settings/router.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/db/models/setting.py`**

```python
from __future__ import annotations
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
```

- [ ] **Step 2: Create `backend/app/modules/settings/schemas.py`**

```python
from __future__ import annotations
from pydantic import BaseModel


PROVIDER_CHOICES = ["openai", "anthropic", "gemini", "ollama"]

DEFAULT_MODELS = {
    "openai": "gpt-4o",
    "anthropic": "claude-opus-4-7",
    "gemini": "gemini-1.5-pro",
    "ollama": "llama3",
}


class LLMSettingsOut(BaseModel):
    provider: str
    model: str
    api_key_set: bool  # never return the actual key
    base_url: str


class LLMSettingsIn(BaseModel):
    provider: str
    model: str
    api_key: str = ""  # empty = keep existing
    base_url: str = ""
```

- [ ] **Step 3: Create `backend/app/modules/settings/service.py`**

```python
from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models.setting import Setting
from .schemas import LLMSettingsIn, LLMSettingsOut


async def _get(db: AsyncSession, key: str) -> str:
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    return row.value if row else ""


async def _set(db: AsyncSession, key: str, value: str) -> None:
    result = await db.execute(select(Setting).where(Setting.key == key))
    row = result.scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))


async def get_llm_settings(db: AsyncSession) -> LLMSettingsOut:
    provider = await _get(db, "llm_provider") or "openai"
    model = await _get(db, "llm_model") or "gpt-4o"
    api_key = await _get(db, "llm_api_key")
    base_url = await _get(db, "llm_base_url")
    return LLMSettingsOut(
        provider=provider,
        model=model,
        api_key_set=bool(api_key),
        base_url=base_url,
    )


async def save_llm_settings(data: LLMSettingsIn, db: AsyncSession) -> LLMSettingsOut:
    await _set(db, "llm_provider", data.provider)
    await _set(db, "llm_model", data.model)
    if data.api_key:
        await _set(db, "llm_api_key", data.api_key)
    await _set(db, "llm_base_url", data.base_url)
    await db.commit()
    return await get_llm_settings(db)


async def get_provider_instance(db: AsyncSession):
    from app.llm.factory import get_provider
    provider = await _get(db, "llm_provider") or "openai"
    model = await _get(db, "llm_model") or "gpt-4o"
    api_key = await _get(db, "llm_api_key")
    base_url = await _get(db, "llm_base_url") or None
    if not api_key and provider != "ollama":
        raise ValueError("LLM API key not configured. Go to Settings to configure it.")
    return get_provider(name=provider, model=model, api_key=api_key, base_url=base_url)
```

- [ ] **Step 4: Create `backend/app/modules/settings/router.py`**

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .schemas import LLMSettingsIn, LLMSettingsOut
from .service import get_llm_settings, save_llm_settings

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def _require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = decode_access_token(credentials.credentials)
    return payload["sub"]


@router.get("/llm", response_model=LLMSettingsOut)
async def get_llm(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(_require_auth),
):
    return await get_llm_settings(db)


@router.put("/llm", response_model=LLMSettingsOut)
async def update_llm(
    body: LLMSettingsIn,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(_require_auth),
):
    return await save_llm_settings(body, db)
```

- [ ] **Step 5: Create `backend/app/modules/settings/__init__.py`**

Empty file.

- [ ] **Step 6: Register in main.py**

In `backend/app/main.py`, add after the google router import:
```python
from app.modules.settings.router import router as settings_router
import app.db.models.setting as _setting_models  # noqa: F401
```

And after `app.include_router(google_router, prefix="/google")`:
```python
app.include_router(settings_router, prefix="/settings")
```

- [ ] **Step 7: Rebuild and test**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
docker compose up --build -d api && sleep 5
curl -s http://localhost:8011/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 8: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add backend/app/db/models/setting.py backend/app/modules/settings/ backend/app/main.py
git commit -m "feat: add LLM settings DB model and CRUD endpoints (GET/PUT /settings/llm)"
```

---

### Task 3: Backend AI modify endpoint

**Files:**
- Modify: `backend/app/modules/scripts/schemas.py`
- Modify: `backend/app/modules/scripts/service.py`
- Modify: `backend/app/modules/scripts/router.py`

- [ ] **Step 1: Add schemas to `backend/app/modules/scripts/schemas.py`**

Append at the end of the file:
```python
class AIModifyRequest(BaseModel):
    prompt: str


class AIFileResult(BaseModel):
    filename: str
    content: str
    file_type: str


class AIModifyResponse(BaseModel):
    files: list[AIFileResult]
    version_message: str


class VersionCreate(BaseModel):
    files: list[ScriptFileIn]
    message: str
```

- [ ] **Step 2: Add `ai_modify_script` and `add_version` to service.py**

Append at the end of `backend/app/modules/scripts/service.py`:
```python
import json
import re


async def ai_modify_script(
    script_id: int,
    prompt: str,
    db: AsyncSession,
) -> dict:
    from app.modules.settings.service import get_provider_instance
    from app.llm.base import LLMMessage

    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    latest = script.versions[0] if script.versions else None
    if not latest or not latest.files:
        raise ValueError("No files found in the latest version")

    # Build file context
    files_context = "\n\n".join(
        f"### {f.filename}\n```javascript\n{f.content}\n```"
        for f in latest.files
    )

    system_prompt = (
        "You are a Google Apps Script expert. "
        "The user will describe a modification to make to their GAS project. "
        "You must return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:\n"
        '{"files": [{"filename": "...", "content": "...", "file_type": "..."}], '
        '"version_message": "short description of what was changed"}\n'
        "Include ALL files (modified and unmodified). "
        "file_type values: server_js, html, json."
    )

    user_message = (
        f"Here are the current files:\n\n{files_context}\n\n"
        f"Please make the following modification:\n{prompt}"
    )

    provider = await get_provider_instance(db)
    raw = await provider.complete([
        LLMMessage(role="system", content=system_prompt),
        LLMMessage(role="user", content=user_message),
    ])

    # Extract JSON from response (handle potential markdown code blocks)
    json_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not json_match:
        raise ValueError(f"LLM did not return valid JSON. Response: {raw[:200]}")

    result = json.loads(json_match.group())
    return result


async def add_version(
    script_id: int,
    files: list,
    message: str,
    owner_email: str,
    db: AsyncSession,
) -> Script:
    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    next_number = (
        max((v.version_number for v in script.versions), default=0) + 1
    )

    version = ScriptVersion(
        script_id=script_id,
        version_number=next_number,
        message=message,
        created_by=owner_email,
    )
    db.add(version)
    await db.flush()

    for f in files:
        db.add(ScriptFile(
            version_id=version.id,
            filename=f.filename,
            content=f.content,
            file_type=f.file_type,
        ))

    await db.commit()
    return await get_script(script_id, db)
```

- [ ] **Step 3: Add routes to router.py**

Append at the end of `backend/app/modules/scripts/router.py`:
```python
from .schemas import AIModifyRequest, AIModifyResponse, VersionCreate


@router.post("/{script_id}/ai-modify", response_model=AIModifyResponse)
async def ai_modify_endpoint(
    script_id: int,
    body: AIModifyRequest,
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    try:
        result = await ai_modify_script(script_id, body.prompt, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{script_id}/versions", response_model=ScriptOut, status_code=201)
async def add_version_endpoint(
    script_id: int,
    body: VersionCreate,
    db: AsyncSession = Depends(get_db),
    email: str = Depends(get_current_email),
):
    try:
        script = await add_version(script_id, body.files, body.message, email, db)
        return script
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

Also add the missing import at the top of router.py (add to existing imports):
```python
from .service import create_script, list_scripts, get_script, ai_modify_script, add_version
```

- [ ] **Step 4: Rebuild and test**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
docker compose up --build -d api && sleep 5
curl -s http://localhost:8011/health
docker compose logs api --tail=5
```

Expected: `{"status":"ok"}` with no errors in logs.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add backend/app/modules/scripts/
git commit -m "feat: add POST /scripts/{id}/ai-modify and POST /scripts/{id}/versions endpoints"
```

---

### Task 4: Frontend settings page

**Files:**
- Create: `frontend/src/app/(app)/settings/page.tsx`
- Modify: `frontend/src/app/(app)/layout.tsx`

- [ ] **Step 1: Add Settings nav item to layout.tsx**

In `frontend/src/app/(app)/layout.tsx`:

Add `Settings` to the lucide-react import:
```tsx
import { LayoutDashboard, FileText, Settings, Menu } from "lucide-react";
```

Add to `navItems` array (before the closing bracket):
```tsx
{ href: "/settings", label: "Paramètres", icon: Settings, roles: ALL_ROLES },
```

- [ ] **Step 2: Create `frontend/src/app/(app)/settings/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2 } from "lucide-react";

const PROVIDERS = [
  { value: "openai",    label: "OpenAI",    placeholder: "sk-..." },
  { value: "anthropic", label: "Anthropic (Claude)", placeholder: "sk-ant-..." },
  { value: "gemini",    label: "Google Gemini", placeholder: "AIza..." },
  { value: "ollama",    label: "Ollama (local)", placeholder: "ollama" },
];

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  anthropic: "claude-opus-4-7",
  gemini: "gemini-1.5-pro",
  ollama: "llama3",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.backendToken) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/llm`, {
      headers: { Authorization: `Bearer ${session.backendToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setProvider(d.provider);
        setModel(d.model);
        setApiKeySet(d.api_key_set);
        setBaseUrl(d.base_url || "");
      });
  }, [session?.backendToken]);

  const handleProviderChange = (p: string) => {
    setProvider(p);
    setModel(DEFAULT_MODELS[p] ?? "");
  };

  const handleSave = async () => {
    if (!session?.backendToken) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/llm`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.backendToken}`,
        },
        body: JSON.stringify({ provider, model, api_key: apiKey, base_url: baseUrl }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      const d = await res.json();
      setApiKeySet(d.api_key_set);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const currentProvider = PROVIDERS.find((p) => p.value === provider);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-heading font-black text-2xl text-white dark:text-white text-extia-night">
          Paramètres <span className="text-extia-yellow">LLM</span>
        </h1>
        <p className="text-white/40 dark:text-white/40 text-slate-500 text-sm mt-1">
          Configurez le provider et le modèle utilisé pour la modification de scripts
        </p>
      </div>

      <div className="bg-white/5 dark:bg-white/5 bg-white border border-white/10 dark:border-white/10 border-slate-200 rounded-2xl p-6 space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-white/70 dark:text-white/70 text-slate-600 text-xs font-medium mb-2">
            Provider
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                onClick={() => handleProviderChange(p.value)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left ${
                  provider === p.value
                    ? "bg-extia-yellow/20 text-extia-yellow border border-extia-yellow/40"
                    : "bg-white/5 dark:bg-white/5 bg-slate-50 text-white/60 dark:text-white/60 text-slate-500 border border-white/10 dark:border-white/10 border-slate-200 hover:border-extia-yellow/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div>
          <label className="block text-white/70 dark:text-white/70 text-slate-600 text-xs font-medium mb-1.5">
            Modèle
          </label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODELS[provider] ?? "nom-du-modèle"}
            className="w-full bg-white/5 dark:bg-white/5 bg-slate-50 border border-white/10 dark:border-white/10 border-slate-200 text-white dark:text-white text-extia-night placeholder-white/25 dark:placeholder-white/25 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
          />
        </div>

        {/* API Key */}
        {provider !== "ollama" && (
          <div>
            <label className="block text-white/70 dark:text-white/70 text-slate-600 text-xs font-medium mb-1.5">
              Clé API{apiKeySet && <span className="ml-2 text-green-400 text-xs">✓ configurée</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeySet ? "Laisser vide pour conserver la clé actuelle" : currentProvider?.placeholder}
              className="w-full bg-white/5 dark:bg-white/5 bg-slate-50 border border-white/10 dark:border-white/10 border-slate-200 text-white dark:text-white text-extia-night placeholder-white/25 dark:placeholder-white/25 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
            />
          </div>
        )}

        {/* Base URL for Ollama */}
        {provider === "ollama" && (
          <div>
            <label className="block text-white/70 dark:text-white/70 text-slate-600 text-xs font-medium mb-1.5">
              Base URL
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-white/5 dark:bg-white/5 bg-slate-50 border border-white/10 dark:border-white/10 border-slate-200 text-white dark:text-white text-extia-night placeholder-white/25 dark:placeholder-white/25 placeholder-slate-400 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl px-4 py-3">
            Paramètres sauvegardés ✓
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 text-extia-night font-bold px-5 py-3 rounded-xl text-sm transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Sauvegarder
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add frontend/src/app/\(app\)/settings/ frontend/src/app/\(app\)/layout.tsx
git commit -m "feat: add LLM settings page with provider/model/key configuration"
```

---

### Task 5: Frontend script detail page with AI chat + diff + apply

**Files:**
- Create: `frontend/src/app/(app)/scripts/[id]/page.tsx`
- Create: `frontend/src/app/(app)/scripts/[id]/components/FileDiff.tsx`
- Create: `frontend/src/app/(app)/scripts/[id]/components/AiChat.tsx`
- Modify: `frontend/src/app/(app)/scripts/components/ScriptCard.tsx` — add link to detail page

- [ ] **Step 1: Create `frontend/src/app/(app)/scripts/[id]/components/FileDiff.tsx`**

```tsx
"use client";

interface FileDiffProps {
  filename: string;
  before: string;
  after: string;
}

export function FileDiff({ filename, before, after }: FileDiffProps) {
  const changed = before !== after;

  return (
    <div className={`rounded-xl border overflow-hidden ${changed ? "border-extia-yellow/30" : "border-white/10"}`}>
      <div className={`px-4 py-2 flex items-center justify-between ${changed ? "bg-extia-yellow/10" : "bg-white/5"}`}>
        <span className="text-xs font-mono font-medium text-white/70">{filename}</span>
        {changed && <span className="text-xs text-extia-yellow font-medium">Modifié</span>}
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="p-3">
          <p className="text-white/30 text-xs mb-1">Avant</p>
          <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap overflow-auto max-h-64">{before}</pre>
        </div>
        <div className="p-3">
          <p className={`text-xs mb-1 ${changed ? "text-extia-yellow" : "text-white/30"}`}>Après</p>
          <pre className={`text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64 ${changed ? "text-white" : "text-white/60"}`}>{after}</pre>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `frontend/src/app/(app)/scripts/[id]/components/AiChat.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface AiFile {
  filename: string;
  content: string;
  file_type: string;
}

interface AiResult {
  files: AiFile[];
  version_message: string;
}

interface Props {
  scriptId: number;
  token: string;
  onResult: (result: AiResult) => void;
}

export function AiChat({ scriptId, token, onResult }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${scriptId}/ai-modify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      const result: AiResult = await res.json();
      onResult(result);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          placeholder="Décris la modification à apporter… (ex: Ajoute une colonne 'Statut' dans l'onglet Recap)"
          rows={3}
          className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-extia-yellow transition-colors resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading}
          className="flex-shrink-0 w-12 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 text-extia-night rounded-xl flex items-center justify-center transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-white/25 text-xs">Cmd/Ctrl+Entrée pour envoyer</p>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
          {error}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `frontend/src/app/(app)/scripts/[id]/page.tsx`**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, CheckCircle, Bot } from "lucide-react";
import Link from "next/link";
import { FileDiff } from "./components/FileDiff";
import { AiChat } from "./components/AiChat";

interface ScriptFile {
  id: number;
  filename: string;
  content: string;
  file_type: string;
}

interface ScriptVersion {
  id: number;
  version_number: number;
  message: string;
  status: string;
  created_at: string;
  files: ScriptFile[];
}

interface Script {
  id: number;
  name: string;
  gas_script_id: string;
  spreadsheet_id: string;
  latest_version: ScriptVersion | null;
}

interface AiResult {
  files: Array<{ filename: string; content: string; file_type: string }>;
  version_message: string;
}

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fetchScript = useCallback(async () => {
    if (!session?.backendToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      });
      if (res.ok) setScript(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id, session?.backendToken]);

  useEffect(() => { fetchScript(); }, [fetchScript]);

  const handleApply = async () => {
    if (!aiResult || !session?.backendToken) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({
            files: aiResult.files,
            message: aiResult.version_message,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      setAiResult(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
      await fetchScript();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setApplying(false);
    }
  };

  const currentFiles = script?.latest_version?.files ?? [];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-extia-yellow" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="p-6">
        <p className="text-white/50">Script introuvable.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/scripts"
          className="text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading font-black text-2xl text-white">
            {script.name}
          </h1>
          <p className="text-white/40 text-sm">
            {script.latest_version
              ? `v${script.latest_version.version_number} — ${script.latest_version.message}`
              : "Aucune version"}
          </p>
        </div>
      </div>

      {/* AI Chat */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-extia-yellow" />
          <h2 className="font-heading font-bold text-white text-sm">Modifier avec l&apos;IA</h2>
        </div>
        <AiChat
          scriptId={script.id}
          token={session?.backendToken ?? ""}
          onResult={setAiResult}
        />
      </div>

      {/* Diff view */}
      {aiResult && (
        <div className="bg-white/[0.03] border border-extia-yellow/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-white text-sm">
              Modifications proposées
              <span className="ml-2 text-white/40 font-normal text-xs">
                {aiResult.version_message}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAiResult(null)}
                className="text-white/40 hover:text-white text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 text-extia-night font-bold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Appliquer
              </button>
            </div>
          </div>

          {applyError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {applyError}
            </div>
          )}

          <div className="space-y-3">
            {aiResult.files.map((af) => {
              const before = currentFiles.find((f) => f.filename === af.filename)?.content ?? "";
              return (
                <FileDiff
                  key={af.filename}
                  filename={af.filename}
                  before={before}
                  after={af.content}
                />
              );
            })}
          </div>
        </div>
      )}

      {applied && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Nouvelle version créée avec succès
        </div>
      )}

      {/* Current files */}
      {!aiResult && currentFiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-white text-sm">Fichiers actuels</h2>
          {currentFiles.map((f) => (
            <div key={f.id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-white/70">{f.filename}</span>
                <span className="text-xs text-white/30">{f.file_type}</span>
              </div>
              <pre className="p-4 text-xs text-white/60 font-mono whitespace-pre-wrap overflow-auto max-h-64">
                {f.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add link from ScriptCard to detail page**

In `frontend/src/app/(app)/scripts/components/ScriptCard.tsx`, read the file and wrap the card's main content with a `Link` to `/scripts/${script.id}`. Add the import at the top:
```tsx
import Link from "next/link";
```

Wrap the outer div with:
```tsx
<Link href={`/scripts/${script.id}`} className="block">
  {/* existing card content */}
</Link>
```

- [ ] **Step 5: Rebuild frontend and test**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
docker compose up --build -d frontend
docker compose logs frontend --tail=10
```

Expected: frontend starts without build errors.

Open `http://localhost:3011/settings` — verify the LLM settings page loads. Configure a provider and API key. Then open a script card → verify it navigates to `/scripts/[id]`. Test the AI chat.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add frontend/src/app/\(app\)/scripts/
git commit -m "feat: script detail page with AI chat, diff view, and apply-as-new-version"
```
