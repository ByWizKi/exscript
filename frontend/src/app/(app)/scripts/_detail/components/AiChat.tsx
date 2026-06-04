"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Loader2, Bot, Send, AlertCircle, Check, X, BookOpen,
  FileText, Trash2, ChevronRight, ChevronDown,
} from "lucide-react";
import { PromptLibrary } from "./PromptLibrary";
import type { ChatMessage, ScriptFile, AiResult, AiStep } from "../types";

const MIN_WIDTH = 320;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 420;
const STORAGE_KEY = "exscript-aichat-width";

interface AiChatProps {
  messages: ChatMessage[];
  aiLoading: boolean;
  currentFiles: ScriptFile[];
  onSend: (prompt: string) => void;
  onSelectFile?: (filename: string, result: AiResult) => void;
  onConfirm?: (originalPrompt: string) => void;
  onCancelClarification?: () => void;
  onDocument?: () => void;
  onClearChat?: () => void;
  prompt: string;
  onPromptChange: (text: string) => void;
}

function StepsAccordion({ steps }: { steps: AiStep[] }) {
  const [open, setOpen] = useState(false);

  const iconFor = (type: AiStep["type"]) => {
    if (type === "done") return <Check className="h-3 w-3 text-green-500" />;
    if (type === "warning") return <AlertCircle className="h-3 w-3 text-amber-400" />;
    if (type === "generating") return <Loader2 className="h-3 w-3 animate-spin text-extia-night dark:text-extia-yellow" />;
    return <ChevronRight className="h-3 w-3 text-slate-400 dark:text-white/40" />;
  };

  if (!steps?.length) return null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/60 transition-colors w-full"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {steps.length} étape{steps.length > 1 ? "s" : ""}
      </button>
      {open && (
        <ol className="mt-1.5 space-y-1">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-white/50">
              <span className="flex-shrink-0 mt-0.5">{iconFor(s.type)}</span>
              <span>{s.message}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function AiChat({
  messages,
  aiLoading,
  currentFiles,
  onSend,
  onSelectFile,
  onConfirm,
  onCancelClarification,
  onDocument,
  onClearChat,
  prompt,
  onPromptChange,
}: AiChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);

  const getInitialWidth = () => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
    return DEFAULT_WIDTH;
  };

  const [width, setWidth] = useState(getInitialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX; // drag left = wider
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      onSend(prompt);
    }
  };

  return (
    <aside
      style={{ width }}
      className="flex-shrink-0 flex flex-col bg-slate-50 dark:bg-extia-night/20 relative"
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-extia-night/20 dark:hover:bg-extia-yellow/20 transition-colors"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-[38px] border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <div className="w-6 h-6 rounded-lg bg-extia-night dark:bg-extia-yellow flex items-center justify-center">
          <Bot className="h-3.5 w-3.5 text-white dark:text-extia-night" />
        </div>
        <span className="font-heading font-bold text-extia-night dark:text-white text-sm flex-1">
          Assistant IA
        </span>
        {onDocument && (
          <button
            onClick={onDocument}
            disabled={aiLoading}
            title="Générer la documentation JSDoc"
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 disabled:opacity-40 transition-colors"
          >
            <FileText className="h-3 w-3" />
            Doc
          </button>
        )}
        {onClearChat && messages.length > 0 && (
          <button
            onClick={onClearChat}
            disabled={aiLoading}
            title="Effacer l'historique"
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/30 hover:text-red-400 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-4">
        {messages.length === 0 && !aiLoading && (
          <div className="py-6 space-y-4">
            <div className="text-center">
              <Bot className="h-8 w-8 text-slate-200 dark:text-white/15 mx-auto mb-3" />
              <p className="text-slate-400 dark:text-white/30 text-xs leading-relaxed">
                Décris une modification à apporter à ton script.
                <br />
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
                  onClick={() => onSend(suggestion)}
                  className="w-full text-left text-[11px] text-slate-400 dark:text-white/40 hover:text-slate-600 dark:hover:text-white/70 bg-slate-100 dark:bg-white/[0.03] hover:bg-slate-200 dark:hover:bg-white/[0.07] border border-slate-200 dark:border-white/[0.06] rounded-xl px-3 py-2 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] bg-extia-night/8 dark:bg-extia-yellow/15 border border-extia-night/20 dark:border-extia-yellow/25 text-extia-night dark:text-white text-xs rounded-2xl rounded-tr-sm px-3 py-2.5">
                {msg.text}
              </div>
            ) : msg.clarification ? (
              <div className={`max-w-[90%] border text-xs rounded-2xl rounded-tl-sm px-3 py-2.5 space-y-2 ${
                msg.clarification.feasible === false
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-slate-100 dark:bg-white/[0.06] border-slate-200 dark:border-white/10"
              }`}>
                {msg.clarification.type === "explanation" ? (
                  <div className="text-slate-600 dark:text-white/80 leading-relaxed [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:space-y-0.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:space-y-0.5 [&_strong]:font-semibold [&_p]:mb-2 [&_p:last-child]:mb-0 [&_code]:bg-slate-200 dark:[&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs">
                    <ReactMarkdown>{msg.clarification.explanation}</ReactMarkdown>
                  </div>
                ) : (
                  <>
                    <p className={`font-medium ${msg.clarification.feasible === false ? "text-red-400" : "text-extia-night dark:text-extia-yellow"}`}>
                      {msg.clarification.reformulation}
                    </p>
                    {msg.clarification.plan.length > 0 && (
                      <ul className="space-y-1">
                        {msg.clarification.plan.map((step, si) => (
                          <li key={si} className="flex items-start gap-1.5 text-slate-500 dark:text-white/60">
                            <span className="text-extia-night/40 dark:text-white/30 flex-shrink-0">{si + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {msg.clarification.files_affected.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {msg.clarification.files_affected.map((f) => (
                          <span key={f} className="text-[10px] font-mono bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 rounded px-1.5 py-0.5">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                    {msg.clarification.confirmed === null && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => onConfirm?.(msg.clarification!.original_prompt)}
                          disabled={aiLoading}
                          className="flex items-center gap-1 bg-extia-night dark:bg-extia-yellow text-white dark:text-extia-night text-[11px] font-bold px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Confirmer
                        </button>
                        <button
                          onClick={() => onCancelClarification?.()}
                          disabled={aiLoading}
                          className="flex items-center gap-1 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60 text-[11px] font-bold px-2.5 py-1 rounded-lg disabled:opacity-40 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Annuler
                        </button>
                      </div>
                    )}
                    {msg.clarification.confirmed === true && (
                      <p className="text-[10px] text-slate-400 dark:text-white/30 flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-500" /> Confirmé — génération en cours…
                      </p>
                    )}
                    {msg.clarification.confirmed === false && msg.clarification.feasible !== false && (
                      <p className="text-[10px] text-slate-400 dark:text-white/30">Annulé.</p>
                    )}
                  </>
                )}
              </div>
            ) : msg.error ? (
              <div className="max-w-[90%] bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{msg.error}</span>
              </div>
            ) : (
              <div className="max-w-[90%] space-y-2">
                <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/80 text-xs rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <p className="font-medium text-extia-night dark:text-extia-yellow mb-1">
                    Modifications prêtes
                  </p>
                  <p className="text-slate-500 dark:text-white/60">{msg.text}</p>
                  {msg.result && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/10 space-y-1">
                      {msg.result.files.map((f) => {
                        const orig = currentFiles.find((cf) => cf.filename === f.filename)?.content;
                        const changed = orig !== f.content;
                        return (
                          <button
                            key={f.filename}
                            onClick={() => onSelectFile?.(f.filename, msg.result!)}
                            className="flex items-center gap-1.5 w-full text-left hover:text-extia-night dark:hover:text-white transition-colors"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${changed ? "bg-extia-night dark:bg-extia-yellow" : "bg-slate-300 dark:bg-white/20"}`} />
                            <span className={`text-[10px] font-mono ${changed ? "text-extia-night dark:text-extia-yellow font-semibold" : "text-slate-400 dark:text-white/40"}`}>
                              {f.filename}
                            </span>
                            {changed && <span className="text-[9px] text-slate-400 dark:text-white/30">modifié</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {msg.result?.steps && <StepsAccordion steps={msg.result.steps} />}
                  {msg.result?.validation_warnings && msg.result.validation_warnings.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-400/20 space-y-1">
                      {msg.result.validation_warnings.map((w, wi) => (
                        <p key={wi} className="flex items-start gap-1 text-[10px] text-amber-500">
                          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {aiLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-extia-night dark:text-extia-yellow" />
              <span className="text-slate-400 dark:text-white/40 text-xs">Traitement en cours…</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-200 dark:border-white/10">
        <div className="flex flex-col gap-2 relative">
          {showPromptLibrary && (
            <PromptLibrary
              onSelect={(template) => {
                onPromptChange(template);
                setShowPromptLibrary(false);
              }}
              onClose={() => setShowPromptLibrary(false)}
            />
          )}
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Ajoute une colonne Statut dans l'onglet Recap…"
            rows={3}
            disabled={aiLoading}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-300 dark:placeholder-white/20 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-extia-night dark:focus:border-extia-yellow transition-colors resize-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 dark:text-white/20 text-[10px]">⌘ + Entrée</span>
              <button
                onClick={() => setShowPromptLibrary((v) => !v)}
                disabled={aiLoading}
                title="Prompts types"
                className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
                  showPromptLibrary
                    ? "bg-extia-night dark:bg-extia-yellow text-white dark:text-extia-night border-transparent"
                    : "text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/10 hover:text-slate-600 dark:hover:text-white/60"
                }`}
              >
                <BookOpen className="h-3 w-3" />
                Modèles
              </button>
            </div>
            <button
              onClick={() => onSend(prompt)}
              disabled={!prompt.trim() || aiLoading}
              className="flex items-center gap-1.5 bg-extia-night dark:bg-extia-yellow hover:bg-extia-night/80 dark:hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-extia-night font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
            >
              <Send className="h-3 w-3" />
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
