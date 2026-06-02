"use client";

import React, { useState } from "react";
import { Loader2, FileCode2, Download, CheckCircle, X, AlertCircle } from "lucide-react";
import type { ScriptFile } from "../types";

interface PulledFile {
  filename: string;
  content: string;
  file_type: string;
}

interface PullPreviewModalProps {
  pulledFiles: PulledFile[];
  currentFiles: ScriptFile[];
  applying: boolean;
  error?: string | null;
  onConfirm: (message: string) => void;
  onDiscard: () => void;
}

export function PullPreviewModal({
  pulledFiles,
  currentFiles,
  applying,
  error,
  onConfirm,
  onDiscard,
}: PullPreviewModalProps) {
  const [message, setMessage] = useState("Pull depuis Google Apps Script");

  const changedFiles = pulledFiles.filter((f) => {
    const current = currentFiles.find((cf) => cf.filename === f.filename);
    return !current || current.content !== f.content;
  });

  const newFiles = pulledFiles.filter(
    (f) => !currentFiles.find((cf) => cf.filename === f.filename)
  );

  const modifiedFiles = changedFiles.filter(
    (f) => !newFiles.find((nf) => nf.filename === f.filename)
  );

  const unchanged = pulledFiles.length - changedFiles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#0d1b3e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Download className="h-4 w-4 text-blue-500" />
            </div>
            <h2 className="font-heading font-black text-extia-night dark:text-white text-base">
              Contenu importé — créer une <span className="text-extia-yellow">version</span> ?
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
          {changedFiles.length === 0 ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/15">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-slate-600 dark:text-white/60">
                Aucune modification — le contenu est déjà à jour.
              </span>
            </div>
          ) : (
            <div>
              <p className="text-slate-400 dark:text-white/40 text-xs font-medium mb-2">
                {changedFiles.length} fichier{changedFiles.length > 1 ? "s" : ""} modifié{changedFiles.length > 1 ? "s" : ""}
                {unchanged > 0 && ` · ${unchanged} inchangé${unchanged > 1 ? "s" : ""}`}
              </p>
              <div className="space-y-1">
                {modifiedFiles.map((f) => (
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

          {changedFiles.length > 0 && (
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
          )}

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
            Annuler
          </button>
          {changedFiles.length > 0 ? (
            <button
              onClick={() => onConfirm(message)}
              disabled={applying || !message.trim()}
              className="flex items-center gap-2 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-40 disabled:cursor-not-allowed text-extia-night font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Créer la version
            </button>
          ) : (
            <button
              onClick={onDiscard}
              className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-extia-night dark:text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
