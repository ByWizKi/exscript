"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface AiFile {
  filename: string;
  content: string;
  file_type: string;
}

interface AiResult {
  files: AiFile[];
  version_message: string;
}

interface Props {
  scriptId: number;
  token: string;
  onResult: (result: AiResult) => void;
}

export function AiChat({ scriptId, token, onResult }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${scriptId}/ai-modify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ prompt }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      const result: AiResult = await res.json();
      onResult(result);
      setPrompt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(); }}
          placeholder="Décris la modification à apporter… (ex: Ajoute une colonne Statut dans l'onglet Recap)"
          rows={3}
          className="flex-1 bg-white/5 border border-white/10 text-white placeholder-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-extia-yellow transition-colors resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading}
          className="flex-shrink-0 w-12 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 text-extia-night rounded-xl flex items-center justify-center transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <p className="text-white/25 text-xs">Cmd/Ctrl+Entrée pour envoyer</p>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
          {error}
        </div>
      )}
    </div>
  );
}
