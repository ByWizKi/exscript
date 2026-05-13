"use client";

import { useState } from "react";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

interface FileEntry {
  filename: string;
  content: string;
  file_type: string;
}

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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-white/70 text-xs font-medium">
                    Fichiers source *
                  </label>
                  <button
                    onClick={addFile}
                    className="flex items-center gap-1 text-extia-yellow hover:text-extia-yellow-hover text-xs font-medium transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un fichier
                  </button>
                </div>

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
