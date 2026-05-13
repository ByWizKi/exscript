"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, CheckCircle, Bot } from "lucide-react";
import Link from "next/link";
import { FileDiff } from "./components/FileDiff";
import { AiChat } from "./components/AiChat";

interface ScriptFile {
  id: number;
  filename: string;
  content: string;
  file_type: string;
}

interface ScriptVersion {
  id: number;
  version_number: number;
  message: string;
  status: string;
  created_at: string;
  files: ScriptFile[];
}

interface Script {
  id: number;
  name: string;
  gas_script_id: string;
  spreadsheet_id: string;
  latest_version: ScriptVersion | null;
}

interface AiResult {
  files: Array<{ filename: string; content: string; file_type: string }>;
  version_message: string;
}

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fetchScript = useCallback(async () => {
    if (!session?.backendToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      });
      if (res.ok) setScript(await res.json());
    } finally {
      setLoading(false);
    }
  }, [id, session?.backendToken]);

  useEffect(() => { fetchScript(); }, [fetchScript]);

  const handleApply = async () => {
    if (!aiResult || !session?.backendToken) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({
            files: aiResult.files,
            message: aiResult.version_message,
          }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      setAiResult(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
      await fetchScript();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setApplying(false);
    }
  };

  const currentFiles = script?.latest_version?.files ?? [];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <Loader2 className="h-6 w-6 animate-spin text-extia-yellow" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="p-6">
        <p className="text-white/50">Script introuvable.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/scripts" className="text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading font-black text-2xl text-white">
            {script.name}
          </h1>
          <p className="text-white/40 text-sm">
            {script.latest_version
              ? `v${script.latest_version.version_number} — ${script.latest_version.message}`
              : "Aucune version"}
          </p>
        </div>
      </div>

      {/* AI Chat */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-extia-yellow" />
          <h2 className="font-heading font-bold text-white text-sm">Modifier avec l&apos;IA</h2>
        </div>
        <AiChat
          scriptId={script.id}
          token={session?.backendToken ?? ""}
          onResult={setAiResult}
        />
      </div>

      {/* Diff view */}
      {aiResult && (
        <div className="bg-white/[0.03] border border-extia-yellow/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-white text-sm">
              Modifications proposées
              <span className="ml-2 text-white/40 font-normal text-xs">{aiResult.version_message}</span>
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAiResult(null)}
                className="text-white/40 hover:text-white text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 text-extia-night font-bold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Appliquer
              </button>
            </div>
          </div>

          {applyError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              {applyError}
            </div>
          )}

          <div className="space-y-3">
            {aiResult.files.map((af) => {
              const before = currentFiles.find((f) => f.filename === af.filename)?.content ?? "";
              return (
                <FileDiff
                  key={af.filename}
                  filename={af.filename}
                  before={before}
                  after={af.content}
                />
              );
            })}
          </div>
        </div>
      )}

      {applied && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Nouvelle version créée avec succès
        </div>
      )}

      {/* Current files */}
      {!aiResult && currentFiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-white text-sm">Fichiers actuels</h2>
          {currentFiles.map((f) => (
            <div key={f.id} className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-mono text-white/70">{f.filename}</span>
                <span className="text-xs text-white/30">{f.file_type}</span>
              </div>
              <pre className="p-4 text-xs text-white/60 font-mono whitespace-pre-wrap overflow-auto max-h-64">
                {f.content}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
