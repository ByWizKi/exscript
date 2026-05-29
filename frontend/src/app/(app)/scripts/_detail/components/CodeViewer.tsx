"use client";
import React from "react";

import type { ScriptFile, AiResult } from "../types";
import { DiffViewer } from "./DiffViewer";

interface CodeViewerProps {
  selectedFile: ScriptFile | null;
  previewContent: string | null;
  pendingResult: AiResult | null;
}

export function CodeViewer({
  selectedFile,
  previewContent,
  pendingResult,
}: CodeViewerProps) {
  const showDiff = pendingResult !== null && previewContent !== null;

  return (
    <section className="flex-1 min-w-0 flex flex-col border-r border-slate-200 dark:border-white/10">
      {selectedFile ? (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex-shrink-0">
            <span className="text-xs font-mono text-slate-500 dark:text-white/60">
              {selectedFile.filename}
            </span>
            {showDiff && (
              <span className="text-[10px] text-extia-yellow font-medium bg-extia-yellow/10 px-2 py-0.5 rounded-full">
                Diff IA
              </span>
            )}
          </div>

          {showDiff ? (
            <DiffViewer
              oldContent={selectedFile.content}
              newContent={previewContent}
            />
          ) : (
            <div className="flex-1 overflow-auto scrollbar-thin">
              <pre className="p-4 text-[11px] text-slate-600 dark:text-white/65 font-mono whitespace-pre leading-relaxed">
                {selectedFile.content}
              </pre>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-white/20 text-sm">
          Sélectionne un fichier
        </div>
      )}
    </section>
  );
}
