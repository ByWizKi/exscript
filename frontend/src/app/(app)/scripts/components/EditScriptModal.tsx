"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

interface Script {
  id: number;
  name: string;
  gas_script_id: string;
  spreadsheet_id: string;
}

interface Props {
  script: Script;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
  onDeleted: () => void;
}

export function EditScriptModal({ script, token, onClose, onSuccess, onDeleted }: Props) {
  const [name, setName] = useState(script.name);
  const [gasScriptId, setGasScriptId] = useState(script.gas_script_id);
  const [spreadsheetId, setSpreadsheetId] = useState(script.spreadsheet_id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${script.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), gas_script_id: gasScriptId.trim(), spreadsheet_id: spreadsheetId.trim() }),
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${script.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      onDeleted();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Erreur inconnue");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#0d1b3e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <h2 className="font-heading font-black text-extia-night dark:text-white text-lg">
            Modifier le <span className="text-extia-yellow">script</span>
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-white/50 hover:text-extia-night dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5">Nom du projet</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-extia-yellow transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5">ID Google Apps Script</label>
            <input
              value={gasScriptId}
              onChange={(e) => setGasScriptId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white font-mono rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-extia-yellow transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5">ID Google Sheet</label>
            <input
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white font-mono rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-extia-yellow transition-colors"
            />
          </div>

          {saveError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{saveError}
            </div>
          )}

          {confirmDelete && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 space-y-3">
              <p className="text-red-400 text-sm font-medium">Supprimer ce script ?</p>
              <p className="text-slate-500 dark:text-white/40 text-xs">Cette action est irréversible. Toutes les versions seront supprimées.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 text-slate-500 dark:text-white/50 hover:text-extia-night dark:hover:text-white text-xs border border-slate-200 dark:border-white/10 rounded-lg py-2 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg py-2 transition-colors"
                >
                  {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirmer la suppression
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deleting || confirmDelete}
            className="flex items-center gap-1.5 text-red-400 hover:text-red-300 disabled:opacity-40 text-sm transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-500 dark:text-white/50 hover:text-extia-night dark:hover:text-white text-sm transition-colors">Annuler</button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
