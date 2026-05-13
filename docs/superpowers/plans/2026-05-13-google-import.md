# Google Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual ID entry in AddScriptModal with Google API pickers that let the user select their GAS project and Google Sheet directly, and auto-import all source files.

**Architecture:** Extend NextAuth to persist the Google `access_token` in the session. Create a frontend-only `useGoogleApis` hook that calls Google APIs directly (Apps Script API v1 + Drive API v3) using the stored token. Update `AddScriptModal` to show import buttons that call these APIs and pre-fill the form.

**Tech Stack:** NextAuth v5, Google Apps Script API v1, Google Drive API v3, React useState/useEffect, existing Tailwind design tokens.

**Prerequisites (manual, done by user before deploying):**
1. Google Cloud Console → APIs & Services → Enable **Apps Script API**
2. Google Cloud Console → APIs & Services → Enable **Google Drive API**

---

## File Structure

- Modify: `frontend/src/auth.ts` — add OAuth scopes + persist `access_token` in JWT
- Modify: `frontend/src/types/next-auth.d.ts` — add `googleAccessToken: string` to Session type
- Create: `frontend/src/hooks/useGoogleApis.ts` — typed wrappers for GAS + Drive API calls
- Modify: `frontend/src/app/(app)/scripts/components/AddScriptModal.tsx` — add import buttons + picker UI

---

### Task 1: Persist Google access_token in NextAuth session

**Files:**
- Modify: `frontend/src/auth.ts`
- Modify: `frontend/src/types/next-auth.d.ts`

- [ ] **Step 1: Add scopes and persist access_token in auth.ts**

Replace the entire `frontend/src/auth.ts` with:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/script.projects.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
          ].join(" "),
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/access-denied",
  },
  callbacks: {
    async signIn({ account }) {
      return !!account?.id_token;
    },
    async jwt({ token, account }) {
      if (account?.id_token) {
        // Persist Google access_token for API calls
        token.googleAccessToken = account.access_token;

        const res = await fetch(
          `${process.env.INTERNAL_API_URL}/auth/google`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_token: account.id_token }),
          }
        );

        if (!res.ok) {
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
      session.googleAccessToken = token.googleAccessToken as string;
      session.user = token.user as typeof session.user;
      return session;
    },
  },
});
```

- [ ] **Step 2: Update next-auth.d.ts type declarations**

Replace `frontend/src/types/next-auth.d.ts` with:

```typescript
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    backendToken: string;
    googleAccessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    googleAccessToken?: string;
    user?: Record<string, unknown>;
    error?: string;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on the modified files.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add frontend/src/auth.ts frontend/src/types/next-auth.d.ts
git commit -m "feat: persist Google access_token in NextAuth session for API calls"
```

---

### Task 2: Create useGoogleApis hook

**Files:**
- Create: `frontend/src/hooks/useGoogleApis.ts`

- [ ] **Step 1: Create the hooks directory and file**

```bash
mkdir -p /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript/frontend/src/hooks
```

- [ ] **Step 2: Write useGoogleApis.ts**

Create `frontend/src/hooks/useGoogleApis.ts`:

```typescript
export interface GasProject {
  scriptId: string;
  title: string;
  parentId?: string; // spreadsheet ID for container-bound scripts
}

export interface GasFile {
  name: string;
  type: "SERVER_JS" | "HTML" | "JSON";
  source: string;
}

export interface DriveSheet {
  id: string;
  name: string;
}

const GAS_BASE = "https://script.googleapis.com/v1";
const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

async function get<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body?.error?.message ?? `Google API error ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchGasProjects(token: string): Promise<GasProject[]> {
  const data = await get<{ projects?: Array<{ scriptId: string; title: string; parentId?: string }> }>(
    `${GAS_BASE}/projects`,
    token
  );
  return (data.projects ?? []).map((p) => ({
    scriptId: p.scriptId,
    title: p.title,
    parentId: p.parentId,
  }));
}

export async function fetchGasFiles(token: string, scriptId: string): Promise<GasFile[]> {
  const data = await get<{ files?: Array<{ name: string; type: string; source: string }> }>(
    `${GAS_BASE}/projects/${scriptId}/content`,
    token
  );
  return (data.files ?? [])
    .filter((f) => f.source !== undefined)
    .map((f) => ({
      name: f.name,
      type: f.type as GasFile["type"],
      source: f.source,
    }));
}

export async function fetchSheets(token: string): Promise<DriveSheet[]> {
  const data = await get<{ files?: Array<{ id: string; name: string }> }>(
    `${DRIVE_BASE}/files?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'&fields=files(id%2Cname)&pageSize=100`,
    token
  );
  return (data.files ?? []).map((f) => ({ id: f.id, name: f.name }));
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add frontend/src/hooks/useGoogleApis.ts
git commit -m "feat: add useGoogleApis hook for GAS and Drive API calls"
```

---

### Task 3: Update AddScriptModal with Google import UI

**Files:**
- Modify: `frontend/src/app/(app)/scripts/components/AddScriptModal.tsx`

The updated modal adds:
- Step 1: A "Importer depuis Google" section showing two pickers side by side: GAS projects list + Sheets list. Selecting a GAS project fills `name` + `gas_script_id` (and `spreadsheet_id` if `parentId` exists). Selecting a Sheet fills `spreadsheet_id`. Manual inputs remain as fallback.
- Step 2: A "Importer depuis GAS" button that calls `fetchGasFiles` and prefills all file entries.

- [ ] **Step 1: Replace AddScriptModal.tsx**

Write `frontend/src/app/(app)/scripts/components/AddScriptModal.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Cloud, RefreshCw } from "lucide-react";
import {
  fetchGasProjects,
  fetchGasFiles,
  fetchSheets,
  type GasProject,
  type DriveSheet,
} from "@/hooks/useGoogleApis";

interface FileEntry {
  filename: string;
  content: string;
  file_type: string;
}

interface Props {
  token: string;
  googleToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

const FILE_TYPES = [
  { value: "server_js", label: "JavaScript (.js)" },
  { value: "html",      label: "HTML (.html)" },
  { value: "json",      label: "JSON (appsscript.json)" },
];

function typeToFileType(type: string): string {
  if (type === "HTML") return "html";
  if (type === "JSON") return "json";
  return "server_js";
}

function typeToExtension(type: string, name: string): string {
  if (name.includes(".")) return name;
  if (type === "HTML") return `${name}.html`;
  if (type === "JSON") return `${name}.json`;
  return `${name}.js`;
}

export function AddScriptModal({ token, googleToken, onClose, onSuccess }: Props) {
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

  // Google import state
  const [gasProjects, setGasProjects] = useState<GasProject[] | null>(null);
  const [sheets, setSheets] = useState<DriveSheet[] | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [importingFiles, setImportingFiles] = useState(false);

  const loadGoogleData = useCallback(async () => {
    setLoadingGoogle(true);
    setGoogleError(null);
    try {
      const [projects, driveSheets] = await Promise.all([
        fetchGasProjects(googleToken),
        fetchSheets(googleToken),
      ]);
      setGasProjects(projects);
      setSheets(driveSheets);
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : "Erreur Google API");
    } finally {
      setLoadingGoogle(false);
    }
  }, [googleToken]);

  const handleSelectGasProject = (project: GasProject) => {
    setGasScriptId(project.scriptId);
    setName((prev) => prev || project.title);
    if (project.parentId) setSpreadsheetId(project.parentId);
  };

  const handleSelectSheet = (sheet: DriveSheet) => {
    setSpreadsheetId(sheet.id);
  };

  const handleImportFiles = async () => {
    if (!gasScriptId) return;
    setImportingFiles(true);
    setError(null);
    try {
      const gasFiles = await fetchGasFiles(googleToken, gasScriptId);
      if (gasFiles.length === 0) {
        setError("Aucun fichier trouvé dans ce projet GAS.");
        return;
      }
      setFiles(
        gasFiles.map((f) => ({
          filename: typeToExtension(f.type, f.name),
          content: f.source,
          file_type: typeToFileType(f.type),
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur import fichiers");
    } finally {
      setImportingFiles(false);
    }
  };

  const addFile = () =>
    setFiles((f) => [...f, { filename: "", content: "", file_type: "server_js" }]);

  const removeFile = (i: number) =>
    setFiles((f) => f.filter((_, idx) => idx !== i));

  const updateFile = (i: number, field: keyof FileEntry, value: string) =>
    setFiles((f) =>
      f.map((file, idx) => (idx === i ? { ...file, [field]: value } : file))
    );

  const step1Valid = name.trim() !== "" && gasScriptId.trim() !== "" && spreadsheetId.trim() !== "";
  const step2Valid = files.length > 0 && files.every((f) => f.filename.trim() !== "" && f.content.trim() !== "");

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
          name,
          gas_script_id: gasScriptId,
          spreadsheet_id: spreadsheetId,
          version_message: versionMessage,
          files,
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
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/10 flex-shrink-0">
          <div
            className="h-1 bg-extia-yellow transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 ? (
            <>
              {/* Google import section */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-extia-yellow" />
                    <span className="text-white/70 text-xs font-medium">Importer depuis Google</span>
                  </div>
                  <button
                    onClick={loadGoogleData}
                    disabled={loadingGoogle}
                    className="flex items-center gap-1.5 text-xs text-extia-yellow hover:text-white transition-colors disabled:opacity-50"
                  >
                    {loadingGoogle
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />
                    }
                    {gasProjects === null ? "Charger" : "Rafraîchir"}
                  </button>
                </div>

                {googleError && (
                  <p className="text-red-400 text-xs">{googleError}</p>
                )}

                {gasProjects !== null && (
                  <div className="grid grid-cols-2 gap-3">
                    {/* GAS projects list */}
                    <div>
                      <p className="text-white/40 text-xs mb-1.5">Projets Apps Script</p>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {gasProjects.length === 0 && (
                          <p className="text-white/30 text-xs">Aucun projet trouvé</p>
                        )}
                        {gasProjects.map((p) => (
                          <button
                            key={p.scriptId}
                            onClick={() => handleSelectGasProject(p)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                              gasScriptId === p.scriptId
                                ? "bg-extia-yellow/20 text-extia-yellow border border-extia-yellow/30"
                                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
                            }`}
                          >
                            {p.title}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sheets list */}
                    <div>
                      <p className="text-white/40 text-xs mb-1.5">Google Sheets</p>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {sheets?.length === 0 && (
                          <p className="text-white/30 text-xs">Aucun sheet trouvé</p>
                        )}
                        {sheets?.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleSelectSheet(s)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                              spreadsheetId === s.id
                                ? "bg-extia-yellow/20 text-extia-yellow border border-extia-yellow/30"
                                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual fields */}
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">
                  Nom du projet *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="AutomatRyma — Kickoff"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-extia-yellow transition-colors"
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">
                  Google Apps Script ID *
                </label>
                <input
                  value={gasScriptId}
                  onChange={(e) => setGasScriptId(e.target.value)}
                  placeholder="1BxY_abc123..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
                />
                <p className="text-white/30 text-xs mt-1">
                  Visible dans l&apos;URL de l&apos;éditeur Apps Script
                </p>
              </div>

              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">
                  Spreadsheet ID *
                </label>
                <input
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder="1ohFViZs2Rd9eWKTxen7..."
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
                />
                <p className="text-white/30 text-xs mt-1">
                  Dans l&apos;URL du Google Sheet : /spreadsheets/d/<strong className="text-white/50">ID</strong>/edit
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-white/70 text-xs font-medium mb-1.5">
                  Message de version
                </label>
                <input
                  value={versionMessage}
                  onChange={(e) => setVersionMessage(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-extia-yellow transition-colors"
                />
              </div>

              {/* Import files from GAS */}
              {gasScriptId && (
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-xs">Fichiers source *</p>
                  <button
                    onClick={handleImportFiles}
                    disabled={importingFiles}
                    className="flex items-center gap-1.5 text-xs text-extia-yellow hover:text-white transition-colors disabled:opacity-50"
                  >
                    {importingFiles
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Cloud className="h-3.5 w-3.5" />
                    }
                    Importer depuis GAS
                  </button>
                </div>
              )}

              <div className="space-y-3">
                {!gasScriptId && (
                  <div className="flex items-center justify-between">
                    <label className="text-white/70 text-xs font-medium">
                      Fichiers source *
                    </label>
                    <button
                      onClick={addFile}
                      className="flex items-center gap-1 text-extia-yellow text-xs font-medium transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter un fichier
                    </button>
                  </div>
                )}

                {gasScriptId && (
                  <div className="flex justify-end">
                    <button
                      onClick={addFile}
                      className="flex items-center gap-1 text-extia-yellow text-xs font-medium transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Ajouter un fichier
                    </button>
                  </div>
                )}

                {files.map((file, i) => (
                  <div
                    key={i}
                    className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3"
                  >
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
                          <option key={t.value} value={t.value} className="bg-[#0d1b3e]">
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {files.length > 1 && (
                        <button
                          onClick={() => removeFile(i)}
                          className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0"
                        >
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
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white text-sm transition-colors"
            >
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

- [ ] **Step 2: Pass googleToken prop from scripts/page.tsx**

In `frontend/src/app/(app)/scripts/page.tsx`, find where `AddScriptModal` is rendered and add the `googleToken` prop. The page uses `useSession()` — update it to also extract `session.googleAccessToken`:

The current page renders:
```tsx
<AddScriptModal
  token={session.data?.backendToken ?? ""}
  onClose={() => setShowModal(false)}
  onSuccess={handleSuccess}
/>
```

Change to:
```tsx
<AddScriptModal
  token={session.data?.backendToken ?? ""}
  googleToken={session.data?.googleAccessToken ?? ""}
  onClose={() => setShowModal(false)}
  onSuccess={handleSuccess}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript/frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Rebuild Docker and test**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
docker compose up --build -d frontend
docker compose logs frontend --tail=20
```

Expected: frontend compiles and starts on port 3011.

Open `http://localhost:3011/scripts`, click "Ajouter un projet", click "Charger" in the Google import section. Verify GAS projects and Sheets appear in the lists. Select a GAS project → verify `gas_script_id` and `name` fields fill in. Click "Suivant", click "Importer depuis GAS" → verify files are populated.

**Note:** After rebuilding, users must log out and log back in for the new OAuth scopes to take effect (the existing session token doesn't have the new scopes).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/SSD_EXT/MacExt/Projects/Extia-Inge/ExScript
git add frontend/src/app/\(app\)/scripts/components/AddScriptModal.tsx frontend/src/app/\(app\)/scripts/page.tsx
git commit -m "feat: Google import picker in AddScriptModal (GAS projects + Sheets + file import)"
```
