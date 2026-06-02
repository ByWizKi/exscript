"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, FileCode2, Loader2, RefreshCw, GitBranch, CheckCircle, Rocket } from "lucide-react";
import { useSession } from "next-auth/react";
import { ScriptRow } from "./components/ScriptRow";
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
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptListItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchScripts = useCallback(async (quiet = false) => {
    if (!session?.backendToken) { setLoading(false); return; }
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts`, {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      });
      if (res.ok) setScripts(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.backendToken]);

  useEffect(() => { fetchScripts(); }, [fetchScripts]);

  const stats = useMemo(() => {
    const total = scripts.length;
    const deployed = scripts.filter((s) => s.latest_status === "deployed").length;
    const tested = scripts.filter((s) => s.latest_status === "tested").length;
    const versions = scripts.reduce((acc, s) => acc + s.version_count, 0);
    return { total, deployed, tested, versions };
  }, [scripts]);

  const filtered = useMemo(() => {
    return scripts.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.gas_script_id.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || (s.latest_status ?? "draft") === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [scripts, search, statusFilter]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto pb-24">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
              Scripts
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-1">
              {loading ? "Chargement…" : `${scripts.length} projet${scripts.length !== 1 ? "s" : ""} au total`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button
              onClick={() => fetchScripts(true)}
              disabled={refreshing || loading}
              title="Rafraîchir"
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white transition-all duration-150 disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-extia-yellow text-extia-night font-semibold text-sm hover:bg-extia-yellow/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/50">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stats.total}</p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-green-50 dark:bg-green-400/10 text-green-500">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stats.tested}</p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Testés</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-extia-yellow/10 text-extia-night dark:text-extia-yellow">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stats.deployed}</p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Déployés</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 dark:bg-blue-400/10 text-blue-500">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white leading-none">{stats.versions}</p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Versions</p>
            </div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl p-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.34-4.34M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
            </svg>
            <input
              type="text"
              placeholder="Nom, identifiant GAS…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 hover:border-slate-300 dark:hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-extia-yellow/30 focus:border-extia-yellow/60 dark:focus:border-extia-yellow/60 transition-[border-color,box-shadow] duration-150"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] text-slate-700 dark:text-white/70 focus:outline-none focus:ring-2 focus:ring-extia-yellow/30 appearance-none cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="tested">Testé</option>
            <option value="deployed">Déployé</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-5 w-5 animate-spin text-extia-yellow" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-extia-yellow/10 flex items-center justify-center mb-4">
                <FileCode2 className="h-5 w-5 text-extia-yellow" />
              </div>
              {scripts.length === 0 ? (
                <>
                  <p className="font-heading font-black text-base text-slate-900 dark:text-white mb-1">Aucun script</p>
                  <p className="text-slate-400 dark:text-white/40 text-sm mb-6">Importez votre premier projet Google Apps Script</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow/90 text-extia-night font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un projet
                  </button>
                </>
              ) : (
                <>
                  <p className="font-heading font-black text-base text-slate-900 dark:text-white mb-1">Aucun résultat</p>
                  <p className="text-slate-400 dark:text-white/40 text-sm">Essayez de modifier vos filtres</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/[0.05]">
                    <tr>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Projet</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Identifiant GAS</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Versions</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Statut</th>
                      <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-white/40 uppercase tracking-wider">Créé le</th>
                      <th className="py-3 px-4 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <ScriptRow key={s.id} script={s} onEdit={() => setEditingScript(s)} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-white/[0.05]">
                {filtered.map((s) => (
                  <ScriptRow key={s.id} script={s} onEdit={() => setEditingScript(s)} mobile />
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-white/[0.05]">
                <p className="text-xs text-slate-400 dark:text-white/30">
                  {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
                  {filtered.length !== scripts.length && ` sur ${scripts.length}`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

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
