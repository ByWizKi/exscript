"use client";
import React from "react";

import { RotateCcw, Loader2, GitCommit } from "lucide-react";
import type { ScriptVersion } from "../types";

interface VersionHistoryProps {
  versions: ScriptVersion[];
  currentVersionId: number | undefined;
  viewingVersionId: number | null;
  restoring: boolean;
  onView: (version: ScriptVersion) => void;
  onRestore: (version: ScriptVersion) => void;
}

export function VersionHistory({
  versions,
  currentVersionId,
  viewingVersionId,
  restoring,
  onView,
  onRestore,
}: VersionHistoryProps) {
  const sorted = [...versions].sort((a, b) => b.version_number - a.version_number);

  return (
    <aside className="flex-1 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50 dark:bg-extia-night/30 min-h-0">
      <div className="px-3 pt-3 pb-1">
        <span className="text-slate-400 dark:text-white/30 text-[10px] font-semibold uppercase tracking-widest">
          Historique
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2">
        {sorted.length === 0 ? (
          <p className="text-slate-300 dark:text-white/25 text-xs px-2 py-3">Aucune version</p>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((v) => {
              const isCurrent = v.id === currentVersionId;
              const isViewing = v.id === viewingVersionId;
              return (
                <li key={v.id}>
                  <button
                    onClick={() => onView(v)}
                    className={`w-full flex flex-col gap-0.5 px-2 py-2 rounded-lg text-left transition-all ${
                      isViewing
                        ? "bg-extia-night/10 dark:bg-extia-yellow/15 text-extia-night dark:text-extia-yellow"
                        : "text-slate-500 dark:text-white/55 hover:text-extia-night dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="h-3 w-3 flex-shrink-0" />
                      <span className="text-[11px] font-mono font-semibold">
                        v{v.version_number}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 rounded-full font-medium">
                          actuelle
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] leading-tight pl-4 line-clamp-2 opacity-80">
                      {v.message}
                    </p>
                    <p className="text-[9px] pl-4 opacity-50">
                      {new Date(v.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>

                  {isViewing && !isCurrent && (
                    <button
                      onClick={() => onRestore(v)}
                      disabled={restoring}
                      className="w-full mt-0.5 flex items-center justify-center gap-1.5 bg-extia-night/10 dark:bg-extia-yellow/10 hover:bg-extia-night/20 dark:hover:bg-extia-yellow/20 disabled:opacity-50 text-extia-night dark:text-extia-yellow text-[10px] font-medium py-1.5 rounded-lg transition-colors"
                    >
                      {restoring ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Restaurer cette version
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
