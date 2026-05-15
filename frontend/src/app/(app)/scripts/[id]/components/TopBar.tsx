"use client";

import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Sparkles,
  Upload,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { Script, AiResult } from "../types";

interface TopBarProps {
  script: Script;
  pendingResult: AiResult | null;
  applying: boolean;
  applied: boolean;
  pushing: boolean;
  pushed: boolean;
  applyError?: string | null;
  pushError?: string | null;
  hasGoogleToken: boolean;
  onCancel: () => void;
  onApply: () => void;
  onApplyAndPush: () => void;
  onPush: () => void;
}

export function TopBar({
  script,
  pendingResult,
  applying,
  applied,
  pushing,
  pushed,
  applyError,
  pushError,
  hasGoogleToken,
  onCancel,
  onApply,
  onApplyAndPush,
  onPush,
}: TopBarProps) {
  return (
    <>
      <header className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-extia-night/60 backdrop-blur flex-shrink-0">
        <Link
          href="/scripts"
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-black text-white text-base leading-tight truncate">
            {script.name}
          </p>
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
                onClick={onCancel}
                className="text-white/40 hover:text-white text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={onApply}
                disabled={applying}
                className="flex items-center gap-1.5 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-50 text-extia-night font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
              >
                {applying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3" />
                )}
                Appliquer
              </button>
              {hasGoogleToken && (
                <button
                  onClick={onApplyAndPush}
                  disabled={applying}
                  className="flex items-center gap-1.5 bg-extia-yellow hover:bg-extia-yellow-hover disabled:opacity-50 text-extia-night font-bold px-3 py-1.5 rounded-lg text-xs transition-colors"
                >
                  {applying ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
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
            onClick={onPush}
            disabled={pushing}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors border border-white/10"
          >
            {pushing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
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
    </>
  );
}
