"use client";

import React, { useState } from "react";
import { Loader2, FileCode2, Upload, CheckCircle, X, AlertCircle } from "lucide-react";
import type { AiResult, ScriptFile } from "../types";

interface CreateVersionModalProps {
  result: AiResult;
  currentFiles: ScriptFile[];
  hasGoogleToken: boolean;
  applying: boolean;
  error?: string | null;
  onApply: (message: string) => void;
  onApplyAndPush: (message: string) => void;
  onDiscard: () => void;
}

export function CreateVersionModal({
  result,
  currentFiles,
  hasGoogleToken,
  applying,
  error,
  onApply,
  onApplyAndPush,
  onDiscard,
}: CreateVersionModalProps) {
  const [message, setMessage] = useState(result.version_message);

  const modifiedFiles = result.files.filter((f) => {
    const orig = currentFiles.find((cf) => cf.filename === f.filename)?.content;
    return orig !== f.content;
  });

  const newFiles = result.files.filter(
    (f) => !currentFiles.find((cf) => cf.filename === f.filename)
  );

  const changedFiles = modifiedFiles.filter(
    (f) => !newFiles.find((nf) => nf.filename === f.filename)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#0d1b3e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-extia-yellow/15 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-extia-yellow" />
            </div>
            <h2 className="font-heading font-black text-extia-night dark:text-white text-base">
              Créer une <span className="text-extia-yellow">version</span> ?
            </h2>
          </div>
          <button
            onClick={onDiscard}
            disabled={applying}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-white/40 hover:text-extia-night dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Modified files */}
          {(changedFiles.length > 0 || newFiles.length > 0) && (
            <div>
              <p className="text-slate-400 dark:text-white/40 text-xs font-medium mb-2">
                {changedFiles.length + newFiles.length} fichier{changedFiles.length + newFiles.length > 1 ? "s" : ""} modifié{changedFiles.length + newFiles.length > 1 ? "s" : ""}
              </p>
              <div className="space-y-1">
                {changedFiles.map((f) => (
                  <div key={f.filename} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-extia-yellow/5 border border-extia-yellow/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-extia-yellow flex-shrink-0" />
                    <FileCode2 className="h-3.5 w-3.5 text-extia-yellow flex-shrink-0" />
                    <span className="text-xs font-mono text-extia-night dark:text-white truncate">{f.filename}</span>
                  </div>
                ))}
                {newFiles.map((f) => (
                  <div key={f.filename} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/5 border border-green-500/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    <FileCode2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    <span className="text-xs font-mono text-extia-night dark:text-white truncate">{f.filename}</span>
                    <span className="text-[10px] text-green-500 ml-auto">nouveau</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version message */}
          <div>
            <label className="block text-slate-500 dark:text-white/50 text-xs font-medium mb-1.5">
              Message de version
            </label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={applying}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-extia-night dark:text-white placeholder-slate-400 dark:placeholder-white/25 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-extia-yellow transition-colors disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-white/10 gap-3">
          <button
            onClick={onDiscard}
            disabled={applying}
            className="text-slate-500 dark:text-white/50 hover:text-extia-night dark:hover:text-white text-sm transition-colors disabled:opacity-40"
          >
            Ignorer
          </button>
          <div className="flex items-center gap-2">
            {hasGoogleToken && (
              <button
                onClick={() => onApplyAndPush(message)}
                disabled={applying || !message.trim()}
                className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-extia-night dark:text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-slate-200 dark:border-white/10"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Créer + Push
              </button>
            )}
            <button
              onClick={() => onApply(message)}
              disabled={applying || !message.trim()}
              className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Créer la version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
