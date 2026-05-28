"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [model, setModel] = useState("gemini-2.0-flash");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.backendToken) return;
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/llm`, {
      headers: { Authorization: `Bearer ${session.backendToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setModel(d.model);
      });
  }, [session?.backendToken]);

  const handleSave = async () => {
    if (!session?.backendToken) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/settings/llm`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.backendToken}`,
        },
        body: JSON.stringify({ model }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto overflow-y-auto scrollbar-thin flex-1">
      <div className="mb-8">
        <h1 className="font-heading font-black text-2xl text-extia-night dark:text-white">
          Paramètres <span className="text-extia-yellow">LLM</span>
        </h1>
        <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
          Modèle Gemini utilisé pour la modification de scripts (via Vertex AI)
        </p>
      </div>

      <div className="card rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-slate-600 dark:text-white/70 text-xs font-medium mb-1.5">
            Modèle
          </label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gemini-2.5-flash"
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-400 dark:placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
          />
          <p className="text-slate-400 dark:text-white/30 text-xs mt-1.5">
            Ex : gemini-2.0-flash, gemini-2.0-pro, gemini-1.5-pro
          </p>
        </div>

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
