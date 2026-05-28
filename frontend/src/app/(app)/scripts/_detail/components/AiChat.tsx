"use client";

import React, { useRef, useEffect } from "react";
import { Loader2, Bot, Send, AlertCircle } from "lucide-react";
import type { ChatMessage, ScriptFile, AiResult } from "../types";

interface AiChatProps {
  messages: ChatMessage[];
  aiLoading: boolean;
  currentFiles: ScriptFile[];
  onSend: (prompt: string) => void;
  onSelectFile?: (filename: string, result: AiResult) => void;
  prompt: string;
  onPromptChange: (text: string) => void;
}

export function AiChat({
  messages,
  aiLoading,
  currentFiles,
  onSend,
  onSelectFile,
  prompt,
  onPromptChange,
}: AiChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  const handleSend = () => {
    onSend(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col bg-slate-50 dark:bg-extia-night/20">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <div className="w-6 h-6 rounded-lg bg-extia-yellow/20 flex items-center justify-center">
          <Bot className="h-3.5 w-3.5 text-extia-yellow" />
        </div>
        <span className="font-heading font-bold text-extia-night dark:text-white text-sm">
          Assistant IA
        </span>
      </div>

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
              <div className="max-w-[85%] bg-extia-yellow/15 border border-extia-yellow/25 text-extia-night dark:text-white text-xs rounded-2xl rounded-tr-sm px-3 py-2.5">
                {msg.text}
              </div>
            ) : msg.error ? (
              <div className="max-w-[90%] bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{msg.error}</span>
              </div>
            ) : (
              <div className="max-w-[90%] space-y-2">
                <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/80 text-xs rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <p className="font-medium text-extia-yellow mb-1">
                    Modifications prêtes
                  </p>
                  <p className="text-slate-500 dark:text-white/60">{msg.text}</p>
                  {msg.result && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-white/10 space-y-1">
                      {msg.result.files.map((f) => {
                        const orig = currentFiles.find(
                          (cf) => cf.filename === f.filename
                        )?.content;
                        const changed = orig !== f.content;
                        return (
                          <button
                            key={f.filename}
                            onClick={() => {
                              onSelectFile?.(f.filename, msg.result!);
                            }}
                            className="flex items-center gap-1.5 w-full text-left hover:text-extia-night dark:hover:text-white transition-colors"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                changed
                                  ? "bg-extia-yellow"
                                  : "bg-slate-300 dark:bg-white/20"
                              }`}
                            />
                            <span
                              className={`text-[10px] font-mono ${
                                changed
                                  ? "text-extia-yellow"
                                  : "text-slate-400 dark:text-white/40"
                              }`}
                            >
                              {f.filename}
                            </span>
                            {changed && (
                              <span className="text-[9px] text-slate-400 dark:text-white/30">
                                modifié
                              </span>
                            )}
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
            <div className="bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-extia-yellow" />
              <span className="text-slate-400 dark:text-white/40 text-xs">Analyse en cours…</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-200 dark:border-white/10">
        <div className="flex flex-col gap-2">
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex: Ajoute une colonne Statut dans l'onglet Recap…"
            rows={3}
            disabled={aiLoading}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-300 dark:placeholder-white/20 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-extia-yellow transition-colors resize-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between">
            <span className="text-slate-300 dark:text-white/20 text-[10px]">⌘ + Entrée</span>
            <button
              onClick={handleSend}
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
  );
}
