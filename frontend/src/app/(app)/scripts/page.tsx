"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchScripts = useCallback(async () => {
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
  }, [session?.backendToken]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-black text-2xl text-white">
            Scripts <span className="text-extia-yellow">GAS</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
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
            <div key={i} className="h-44 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-extia-yellow/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📜</span>
          </div>
          <p className="text-white font-semibold mb-1">Aucun script</p>
          <p className="text-white/40 text-sm mb-6">Ajoutez votre premier projet GAS</p>
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
          googleToken={session?.googleAccessToken ?? ""}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); fetchScripts(); }}
        />
      )}
    </div>
  );
}
