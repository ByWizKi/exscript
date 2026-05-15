"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft, Loader2, CheckCircle, Bot, FileCode2,
  Send, ChevronRight, AlertCircle, Sparkles, Upload,
} from "lucide-react";
import Link from "next/link";

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

interface AiFile {
  filename: string;
  content: string;
  file_type: string;
}

interface AiResult {
  files: AiFile[];
  version_message: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  result?: AiResult;
  error?: string;
}

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<AiResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushed, setPushed] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchScript = useCallback(async () => {
    if (!session?.backendToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`, {
        headers: { Authorization: `Bearer ${session.backendToken}` },
      });
      if (res.ok) {
        const data: Script = await res.json();
        setScript(data);
        if (data.latest_version?.files?.length) {
          setSelectedFilename((prev) =>
            prev && data.latest_version!.files.find((f) => f.filename === prev)
              ? prev
              : data.latest_version!.files[0].filename
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, session?.backendToken]);

  useEffect(() => { fetchScript(); }, [fetchScript]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  const currentFiles = script?.latest_version?.files ?? [];

  const selectedFile = selectedFilename
    ? currentFiles.find((f) => f.filename === selectedFilename) ?? null
    : null;

  const previewContent = pendingResult
    ? pendingResult.files.find((f) => f.filename === selectedFilename)?.content ?? null
    : null;

  const handleSend = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text || aiLoading || !session?.backendToken) return;
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setAiLoading(true);
    try {
      // Build conversation history (user/assistant pairs, exclude errors)
      const history = messages
        .filter((m: ChatMessage) => !m.error)
        .map((m: ChatMessage) => ({
          role: m.role,
          content: m.text,
        }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/ai-modify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.backendToken}`,
        },
        body: JSON.stringify({
          prompt: text,
          google_access_token: session.googleAccessToken,
          history,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");
      const result: AiResult = data;
      setPendingResult(result);
      // auto-select first modified file
      const firstMod = result.files.find(
        (f: AiFile) => f.content !== currentFiles.find((cf: ScriptFile) => cf.filename === f.filename)?.content
      );
      if (firstMod) setSelectedFilename(firstMod.filename);
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          role: "assistant" as const,
          text: result.version_message,
          result,
        },
      ]);
    } catch (e) {
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "assistant" as const, text: "", error: e instanceof Error ? e.message : "Erreur inconnue" },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApply = async () => {
    if (!pendingResult || !session?.backendToken) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.backendToken}`,
        },
        body: JSON.stringify({ files: pendingResult.files, message: pendingResult.version_message }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      setPendingResult(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
      await fetchScript();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setApplying(false);
    }
  };

  const handleApplyAndPush = async () => {
    if (!pendingResult || !session?.backendToken || !session?.googleAccessToken) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.backendToken}`,
        },
        body: JSON.stringify({ files: pendingResult.files, message: pendingResult.version_message }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      setPendingResult(null);
      await fetchScript();
      // then push
      await handlePush();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setApplying(false);
    }
  };

  const handlePush = async () => {
    if (!session?.googleAccessToken) return;
    setPushing(true);
    setPushError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.backendToken}`,
        },
        body: JSON.stringify({ access_token: session.googleAccessToken }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur push");
      }
      setPushed(true);
      setTimeout(() => setPushed(false), 3000);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-extia-yellow" />
      </div>
    );
  }

  if (!script) {
    return (
      <div className="p-8 text-white/50">Script introuvable.</div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>

      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-extia-night/60 backdrop-blur flex-shrink-0">
        <Link href="/scripts" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-black text-white text-base leading-tight truncate">{script.name}</p>
          <p className="text-white/35 text-xs">
            {script.latest_version
              ? `v${script.latest_version.version_number} · ${script.latest_version.message}`
              : "Aucune version"}
          </p>
        </div>

        {/* Apply banner */}
        {pendingResult && (
          <div className="flex items-center gap-3 bg-extia-yellow/10 border border-extia-yellow/30 rounded-xl px-4 py-2">
            <Sparkles className="h-4 w-4 text-extia-yellow flex-shrink-0" />
            <span className="text-extia-yellow text-xs font-medium hidden sm:block">
              {pendingResult.version_message}
            </span>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={() => setPendingResult(null)}
                className="text-white/40 hover:text-white text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex items-center gap-1.5 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-50 text-extia-night font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
              >
                {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                Appliquer
              </button>
              {session?.googleAccessToken && (
                <button
                  onClick={handleApplyAndPush}
                  disabled={applying}
                  className="flex items-center gap-1.5 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-50 text-extia-night font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Appliquer + Push
                </button>
              )}
            </div>
          </div>
        )}

        {applied && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Version créée</span>
          </div>
        )}

        {/* Push to GAS */}
        {!pendingResult && script.latest_version && (
          <button
            onClick={handlePush}
            disabled={pushing}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors border border-white/10"
          >
            {pushing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {pushed ? "Poussé ✓" : "Push GAS"}
          </button>
        )}
      </header>

      {applyError && (
        <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-3.5 w-3.5" />
          {applyError}
        </div>
      )}
      {pushError && (
        <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-3.5 w-3.5" />
          Push GAS : {pushError}
        </div>
      )}

      {/* ── Main 3-column ── */}
      <div className="flex flex-1 min-h-0">

        {/* LEFT — file list */}
        <aside className="w-52 flex-shrink-0 border-r border-white/10 flex flex-col bg-extia-night/30">
          <div className="px-3 pt-3 pb-1">
            <span className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">Fichiers</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {currentFiles.length === 0 ? (
              <p className="text-white/25 text-xs px-2 py-3">Aucun fichier</p>
            ) : (
              <ul className="space-y-0.5">
                {currentFiles.map((f) => {
                  const isActive = f.filename === selectedFilename;
                  const isModified = pendingResult
                    ? pendingResult.files.find((af) => af.filename === f.filename)?.content !== f.content
                    : false;
                  return (
                    <li key={f.filename}>
                      <button
                        onClick={() => setSelectedFilename(f.filename)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all ${
                          isActive
                            ? "bg-extia-yellow/15 text-extia-yellow"
                            : "text-white/55 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <FileCode2 className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="text-[11px] font-mono truncate flex-1">{f.filename}</span>
                        {isModified && (
                          <span className="w-2 h-2 rounded-full bg-extia-yellow flex-shrink-0" title="Modifié" />
                        )}
                        {isActive && <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-40" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* CENTER — code viewer / diff */}
        <section className="flex-1 min-w-0 flex flex-col border-r border-white/10">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
                <span className="text-xs font-mono text-white/60">{selectedFile.filename}</span>
                {pendingResult && previewContent !== null && (
                  <span className="text-[10px] text-extia-yellow font-medium bg-extia-yellow/10 px-2 py-0.5 rounded-full">
                    Aperçu des modifications
                  </span>
                )}
              </div>

              {pendingResult && previewContent !== null ? (
                /* Diff view */
                <div className="flex-1 overflow-auto grid grid-cols-2 divide-x divide-white/10">
                  <div className="overflow-auto">
                    <div className="px-3 py-1.5 border-b border-white/10 bg-white/[0.02]">
                      <span className="text-[10px] text-white/30 font-medium">Avant</span>
                    </div>
                    <pre className="p-4 text-[11px] text-white/55 font-mono whitespace-pre leading-relaxed">
                      {selectedFile.content}
                    </pre>
                  </div>
                  <div className="overflow-auto">
                    <div className="px-3 py-1.5 border-b border-white/10 bg-extia-yellow/5">
                      <span className="text-[10px] text-extia-yellow font-medium">Après</span>
                    </div>
                    <pre className="p-4 text-[11px] text-white font-mono whitespace-pre leading-relaxed">
                      {previewContent}
                    </pre>
                  </div>
                </div>
              ) : (
                /* Plain viewer */
                <div className="flex-1 overflow-auto">
                  <pre className="p-4 text-[11px] text-white/65 font-mono whitespace-pre leading-relaxed">
                    {selectedFile.content}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
              Sélectionne un fichier
            </div>
          )}
        </section>

        {/* RIGHT — AI chat */}
        <aside className="w-80 flex-shrink-0 flex flex-col bg-extia-night/20">
          {/* Chat header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="w-6 h-6 rounded-lg bg-extia-yellow/20 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-extia-yellow" />
            </div>
            <span className="font-heading font-bold text-white text-sm">Assistant IA</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && !aiLoading && (
              <div className="py-6 space-y-4">
                <div className="text-center">
                  <Bot className="h-8 w-8 text-white/15 mx-auto mb-3" />
                  <p className="text-white/30 text-xs leading-relaxed">
                    Décris une modification à apporter à ton script.<br />
                    L&apos;IA va analyser les fichiers et proposer les changements.
                  </p>
                </div>
                <div className="space-y-1.5">
                  {[
                    "Ajoute une validation des données avant traitement",
                    "Optimise les performances de la boucle principale",
                    "Ajoute des logs pour faciliter le débogage",
                    "Explique ce que fait ce script",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="w-full text-left text-[11px] text-white/40 hover:text-white/70 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded-xl px-3 py-2 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[85%] bg-extia-yellow/15 border border-extia-yellow/25 text-white text-xs rounded-2xl rounded-tr-sm px-3 py-2.5">
                    {msg.text}
                  </div>
                ) : msg.error ? (
                  <div className="max-w-[90%] bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-start gap-2">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span>{msg.error}</span>
                  </div>
                ) : (
                  <div className="max-w-[90%] space-y-2">
                    <div className="bg-white/[0.06] border border-white/10 text-white/80 text-xs rounded-2xl rounded-tl-sm px-3 py-2.5">
                      <p className="font-medium text-extia-yellow mb-1">Modifications prêtes</p>
                      <p className="text-white/60">{msg.text}</p>
                      {msg.result && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          {msg.result.files.map((f) => {
                            const orig = currentFiles.find((cf) => cf.filename === f.filename)?.content;
                            const changed = orig !== f.content;
                            return (
                              <button
                                key={f.filename}
                                onClick={() => {
                                  setSelectedFilename(f.filename);
                                  setPendingResult(msg.result!);
                                }}
                                className="flex items-center gap-1.5 w-full text-left hover:text-white transition-colors"
                              >
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${changed ? "bg-extia-yellow" : "bg-white/20"}`} />
                                <span className={`text-[10px] font-mono ${changed ? "text-extia-yellow" : "text-white/40"}`}>
                                  {f.filename}
                                </span>
                                {changed && <span className="text-[9px] text-white/30">modifié</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {aiLoading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-extia-yellow" />
                  <span className="text-white/40 text-xs">Analyse en cours…</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-white/10">
            <div className="flex flex-col gap-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                }}
                placeholder="Ex: Ajoute une colonne Statut dans l'onglet Recap…"
                rows={3}
                disabled={aiLoading}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-extia-yellow transition-colors resize-none disabled:opacity-50"
              />
              <div className="flex items-center justify-between">
                <span className="text-white/20 text-[10px]">⌘ + Entrée</span>
                <button
                  onClick={() => handleSend()}
                  disabled={!prompt.trim() || aiLoading}
                  className="flex items-center gap-1.5 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  <Send className="h-3 w-3" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
