"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import {
  fetchGasProjects,
  fetchGasFiles,
  fetchSheets,
  type GasProject,
  type DriveSheet,
} from "@/hooks/useGoogleApis";

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
  const [gasProjects, setGasProjects] = useState<GasProject[]>([]);
  const [sheets, setSheets] = useState<DriveSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] = useState<GasProject | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<DriveSheet | null>(null);
  const [name, setName] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Auto-load on open
  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [projects, driveSheets] = await Promise.all([
          fetchGasProjects(googleToken),
          fetchSheets(googleToken),
        ]);
        setGasProjects(projects);
        setSheets(driveSheets);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Erreur Google API");
      } finally {
        setLoading(false);
      }
    })();
  }, [googleToken]);

  const handleSelectProject = (project: GasProject) => {
    setSelectedProject(project);
    setName(project.title);
    // Auto-select sheet if parentId matches
    if (project.parentId) {
      const match = sheets.find((s) => s.id === project.parentId);
      if (match) setSelectedSheet(match);
    }
  };

  const canCreate = !!selectedProject && !!selectedSheet && name.trim() !== "";

  const handleCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Import files from GAS
      const gasFiles = await fetchGasFiles(googleToken, selectedProject!.scriptId);
      const files = gasFiles.map((f) => ({
        filename: typeToExtension(f.type, f.name),
        content: f.source,
        file_type: typeToFileType(f.type),
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          gas_script_id: selectedProject!.scriptId,
          spreadsheet_id: selectedSheet!.id,
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
      <div className="w-full max-w-lg bg-[#0d1b3e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="font-heading font-black text-white text-lg">
            Ajouter un projet <span className="text-extia-yellow">GAS</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-extia-yellow" />
              <p className="text-white/40 text-sm">Chargement depuis Google Drive…</p>
            </div>
          ) : loadError ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {loadError}
            </div>
          ) : (
            <>
              {/* GAS Projects */}
              <div>
                <p className="text-white/50 text-xs font-medium mb-2">Projet Apps Script</p>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {gasProjects.length === 0 && (
                    <p className="text-white/30 text-xs py-2">Aucun projet Apps Script trouvé</p>
                  )}
                  {gasProjects.map((p) => (
                    <button
                      key={p.scriptId}
                      onClick={() => handleSelectProject(p)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selectedProject?.scriptId === p.scriptId
                          ? "bg-extia-yellow/20 text-extia-yellow border border-extia-yellow/30"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sheets */}
              <div>
                <p className="text-white/50 text-xs font-medium mb-2">Google Sheet associé</p>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {sheets.length === 0 && (
                    <p className="text-white/30 text-xs py-2">Aucun Google Sheet trouvé</p>
                  )}
                  {sheets.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSheet(s)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        selectedSheet?.id === s.id
                          ? "bg-extia-yellow/20 text-extia-yellow border border-extia-yellow/30"
                          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              {selectedProject && (
                <div>
                  <label className="block text-white/50 text-xs font-medium mb-1.5">
                    Nom du projet
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-extia-yellow transition-colors"
                  />
                </div>
              )}
            </>
          )}

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {saveError}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !loadError && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 flex-shrink-0">
            <button onClick={onClose} className="text-white/50 hover:text-white text-sm transition-colors">
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || saving}
              className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Import en cours…" : "Créer le projet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
