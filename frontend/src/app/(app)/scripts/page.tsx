"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileCode2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { ScriptCard } from "./components/ScriptCard";
import { apiFetch } from "@/lib/apiFetch";
import { AddScriptModal } from "./components/AddScriptModal";
import { EditScriptModal } from "./components/EditScriptModal";

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
  const [editingScript, setEditingScript] = useState<ScriptListItem | null>(null);

  const fetchScripts = useCallback(async () => {
    if (!session?.backendToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`, {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      });
      if (res.ok) setScripts(await res.json());
    } finally {
      setLoading(false);
    }
  }, [session?.backendToken]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  return (
    <div className="p-6 max-w-5xl mx-auto overflow-y-auto scrollbar-thin flex-1 w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-black text-2xl text-extia-night dark:text-white">
            Scripts <span className="text-extia-yellow">Google Apps Script</span>
          </h1>
          {!loading && (
            <p className="text-slate-400 dark:text-white/40 text-sm mt-1">
              {scripts.length} projet{scripts.length !== 1 ? "s" : ""} enregistré{scripts.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover text-extia-night font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:block">Ajouter un projet</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/[0.07] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-extia-yellow/10 dark:bg-extia-yellow/10 flex items-center justify-center mb-4">
            <FileCode2 className="h-6 w-6 text-extia-yellow" />
          </div>
          <p className="font-heading font-black text-lg text-extia-night dark:text-white mb-1">
            Aucun script
          </p>
          <p className="text-slate-400 dark:text-white/40 text-sm mb-6">
            Importez votre premier projet Google Apps Script
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter un projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {scripts.map((s) => <ScriptCard key={s.id} script={s} onEdit={() => setEditingScript(s)} />)}
        </div>
      )}

      {showModal && (
        <AddScriptModal
          token={session?.backendToken ?? ""}
          googleToken={session?.googleAccessToken ?? ""}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchScripts(); }}
        />
      )}

      {editingScript && (
        <EditScriptModal
          script={editingScript}
          token={session?.backendToken ?? ""}
          onClose={() => setEditingScript(null)}
          onSuccess={() => { setEditingScript(null); fetchScripts(); }}
          onDeleted={() => { setEditingScript(null); fetchScripts(); }}
        />
      )}
    </div>
  );
}
