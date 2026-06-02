"use client";
import React from "react";

import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Sparkles,
  Upload,
  Download,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { Script, AiResult } from "../types";

interface TopBarProps {
  script: Script;
  pendingResult: AiResult | null;
  applied: boolean;
  pushing: boolean;
  pushed: boolean;
  pulling: boolean;
  pulled: boolean;
  pushError?: string | null;
  pullError?: string | null;
  hasGoogleToken: boolean;
  onPush: () => void;
  onPull: () => void;
  onCreateVersion: () => void;
}

export function TopBar({
  script,
  pendingResult,
  applied,
  pushing,
  pushed,
  pulling,
  pulled,
  pushError,
  pullError,
  hasGoogleToken,
  onPush,
  onPull,
  onCreateVersion,
}: TopBarProps) {
  return (
    <>
      <header className="flex items-center gap-3 px-5 h-[58px] border-b border-slate-200 dark:border-white/10 bg-white dark:bg-extia-night/60 backdrop-blur flex-shrink-0">
        <Link
          href="/scripts"
          className="p-1.5 rounded-lg text-slate-400 dark:text-white/40 hover:text-extia-night dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-black text-extia-night dark:text-white text-base leading-tight truncate">
            {script.name}
          </p>
          <p className="text-slate-400 dark:text-white/35 text-xs">
            {script.latest_version
              ? `v${script.latest_version.version_number} · ${script.latest_version.message}`
              : "Aucune version"}
          </p>
        </div>

        {/* Pending indicator */}
        {pendingResult && (
          <button
            onClick={onCreateVersion}
            className="flex items-center gap-2 bg-extia-night dark:bg-extia-yellow hover:bg-extia-night/80 dark:hover:bg-extia-yellow/90 text-white dark:text-extia-night font-bold rounded-xl px-3 py-1.5 text-xs transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Créer la version</span>
          </button>
        )}

        {applied && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs">Version créée</span>
          </div>
        )}

        {/* Pull / Push buttons */}
        {hasGoogleToken && (
          <div className="flex items-center gap-2">
            <button
              onClick={onPull}
              disabled={pulling || pushing}
              title="Importer la version actuelle depuis Google Apps Script"
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 disabled:opacity-40 text-extia-night dark:text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors border border-slate-200 dark:border-white/10"
            >
              {pulling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Download className="h-3 w-3" />
              )}
              {pulled ? "Importé ✓" : "Importer"}
            </button>
            {script.latest_version && (
              <button
                onClick={onPush}
                disabled={pushing || pulling}
                title="Envoyer la version actuelle vers Google Apps Script"
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 disabled:opacity-40 text-extia-night dark:text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors border border-slate-200 dark:border-white/10"
              >
                {pushing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3" />
                )}
                {pushed ? "Publié ✓" : "Publier"}
              </button>
            )}
          </div>
        )}
      </header>

      {pushError && (
        <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-3.5 w-3.5" />
          Publier : {pushError}
        </div>
      )}
      {pullError && (
        <div className="px-5 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="h-3.5 w-3.5" />
          Importer : {pullError}
        </div>
      )}
    </>
  );
}
