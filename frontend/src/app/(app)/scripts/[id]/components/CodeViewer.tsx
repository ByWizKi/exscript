"use client";

import type { ScriptFile, AiResult } from "../types";

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
  return (
    <section className="flex-1 min-w-0 flex flex-col border-r border-white/10">
      {selectedFile ? (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/[0.02] flex-shrink-0">
            <span className="text-xs font-mono text-white/60">
              {selectedFile.filename}
            </span>
            {pendingResult && previewContent !== null && (
              <span className="text-[10px] text-extia-yellow font-medium bg-extia-yellow/10 px-2 py-0.5 rounded-full">
                Aperçu des modifications
              </span>
            )}
          </div>

          {pendingResult && previewContent !== null ? (
            <div className="flex-1 overflow-auto grid grid-cols-2 divide-x divide-white/10">
              <div className="overflow-auto">
                <div className="px-3 py-1.5 border-b border-white/10 bg-white/[0.02]">
                  <span className="text-[10px] text-white/30 font-medium">
                    Avant
                  </span>
                </div>
                <pre className="p-4 text-[11px] text-white/55 font-mono whitespace-pre leading-relaxed">
                  {selectedFile.content}
                </pre>
              </div>
              <div className="overflow-auto">
                <div className="px-3 py-1.5 border-b border-white/10 bg-extia-yellow/5">
                  <span className="text-[10px] text-extia-yellow font-medium">
                    Après
                  </span>
                </div>
                <pre className="p-4 text-[11px] text-white font-mono whitespace-pre leading-relaxed">
                  {previewContent}
                </pre>
              </div>
            </div>
          ) : (
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
  );
}
