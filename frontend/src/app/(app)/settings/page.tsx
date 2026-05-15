"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2 } from "lucide-react";

const PROVIDERS = [
  { value: "openai",    label: "OpenAI",              placeholder: "sk-..." },
  { value: "anthropic", label: "Anthropic (Claude)",  placeholder: "sk-ant-..." },
  { value: "gemini",    label: "Google Gemini",        placeholder: "AIza..." },
  { value: "ollama",    label: "Ollama (local)",       placeholder: "ollama" },
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
    <div className="p-6 max-w-2xl mx-auto overflow-y-auto flex-1">
      <div className="mb-8">
        <h1 className="font-heading font-black text-2xl text-extia-night dark:text-white">
          Paramètres <span className="text-extia-yellow">LLM</span>
        </h1>
        <p className="text-slate-500 dark:text-white/40 text-sm mt-1">
          Configurez le provider et le modèle utilisé pour la modification de scripts
        </p>
      </div>

      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-slate-600 dark:text-white/70 text-xs font-medium mb-2">
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
                    : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:border-extia-yellow/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div>
          <label className="block text-slate-600 dark:text-white/70 text-xs font-medium mb-1.5">
            Modèle
          </label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODELS[provider] ?? "nom-du-modèle"}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-400 dark:placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
          />
        </div>

        {/* API Key */}
        {provider !== "ollama" && (
          <div>
            <label className="block text-slate-600 dark:text-white/70 text-xs font-medium mb-1.5">
              Clé API
              {apiKeySet && <span className="ml-2 text-green-500 text-xs">✓ configurée</span>}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeySet ? "Laisser vide pour conserver la clé actuelle" : currentProvider?.placeholder}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-400 dark:placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
            />
          </div>
        )}

        {/* Base URL for Ollama */}
        {provider === "ollama" && (
          <div>
            <label className="block text-slate-600 dark:text-white/70 text-xs font-medium mb-1.5">
              Base URL
            </label>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-400 dark:placeholder-white/25 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-extia-yellow transition-colors"
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
