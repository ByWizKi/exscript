"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Sheet, AlertCircle, Search, CheckCircle } from "lucide-react";
import { fetchSheets, fetchGasFiles, type DriveSheet } from "@/hooks/useGoogleApis";
import { apiFetch } from "@/lib/apiFetch";

interface Props {
  token: string;
  googleToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

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
  const [sheets, setSheets] = useState<DriveSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selectedSheet, setSelectedSheet] = useState<DriveSheet | null>(null);
  const [scriptUrl, setScriptUrl] = useState("");
  const [scriptId, setScriptId] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const s = await fetchSheets(googleToken);
        setSheets(s);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Erreur Google API");
      } finally {
        setLoading(false);
      }
    })();
  }, [googleToken]);

  const extractScriptId = (input: string): string => {
    const match = input.match(/\/projects\/([a-zA-Z0-9_-]{20,})/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
    return "";
  };

  const handleSelectSheet = (sheet: DriveSheet) => {
    setSelectedSheet(sheet);
    setName(sheet.name);
    setScriptUrl("");
    setScriptId("");
    setSaveError(null);
  };

  const handleScriptUrl = (val: string) => {
    setScriptUrl(val);
    setScriptId(extractScriptId(val));
  };

  const filtered = sheets.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = !!selectedSheet && !!scriptId && name.trim() !== "";

  const handleCreate = async () => {
    if (!canCreate || !selectedSheet) return;
    setSaving(true);
    setSaveError(null);
    try {
      const gasFiles = await fetchGasFiles(googleToken, scriptId);
      const files = gasFiles.map((f) => ({
        filename: typeToExtension(f.type, f.name),
        content: f.source,
        file_type: typeToFileType(f.type),
      }));

      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          gas_script_id: scriptId,
          spreadsheet_id: selectedSheet.id,
          version_message: "Version initiale",
          files: files.length > 0 ? files : [{ filename: "Code.js", content: "// empty", file_type: "server_js" }],
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      onSuccess();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-[#0d1b3e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
          <h2 className="font-heading font-black text-extia-night dark:text-white text-lg">
            Importer depuis <span className="text-extia-yellow">Google Drive</span>
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-white/50 hover:text-extia-night dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-extia-yellow" />
              <p className="text-slate-400 dark:text-white/40 text-sm">Chargement des Google Sheets…</p>
            </div>
          ) : loadError ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{loadError}
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-white/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un Google Sheet…"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-400 dark:placeholder-white/25 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-extia-yellow transition-colors"
                />
              </div>

              {/* Sheet list */}
              <div>
                <p className="text-slate-400 dark:text-white/40 text-xs mb-2">{filtered.length} sheets trouvés</p>
                <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                  {filtered.map((s) => {
                    const isSelected = selectedSheet?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSelectSheet(s)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors border ${
                          isSelected
                            ? "bg-extia-yellow/15 border-extia-yellow/30"
                            : "bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:hover:bg-white/8"
                        }`}
                      >
                        <Sheet className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-extia-yellow" : "text-slate-400 dark:text-white/35"}`} />
                        <span className={`text-sm truncate ${isSelected ? "text-extia-yellow" : "text-slate-600 dark:text-white/70"}`}>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Script URL + name */}
              {selectedSheet && (
                <div className="space-y-3 border-t border-slate-200 dark:border-white/10 pt-4">
                  <div>
                    <label className="block text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5">
                      URL ou ID du projet Apps Script <span className="text-red-400">*</span>
                    </label>
                    <input
                      value={scriptUrl}
                      onChange={(e) => handleScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/home/projects/ABC123…"
                      className={`w-full bg-slate-50 dark:bg-white/5 border text-extia-night dark:text-white placeholder-slate-400 dark:placeholder-white/25 rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                        scriptId ? "border-green-500/40 focus:border-green-400" : "border-slate-200 dark:border-white/10 focus:border-extia-yellow"
                      }`}
                    />
                    {scriptId ? (
                      <p className="flex items-center gap-1.5 text-green-400 text-xs mt-1.5">
                        <CheckCircle className="h-3 w-3" /> ID détecté : <span className="font-mono opacity-70">{scriptId.slice(0, 20)}…</span>
                      </p>
                    ) : (
                      <p className="text-slate-400 dark:text-white/25 text-xs mt-1">
                        Google Sheets → Extensions → Apps Script → copie l&apos;URL
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5">Nom du projet dans ExScript</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-extia-yellow transition-colors"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !loadError && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 flex-shrink-0">
            <button onClick={onClose} className="text-slate-500 dark:text-white/50 hover:text-extia-night dark:hover:text-white text-sm transition-colors">Annuler</button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || saving}
              className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Import en cours…" : "Importer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
