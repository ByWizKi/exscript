"use client";

import { FileCode2, ChevronRight } from "lucide-react";
import type { ScriptFile, AiResult } from "../types";

interface FileListProps {
  files: ScriptFile[];
  selectedFilename: string | null;
  pendingResult: AiResult | null;
  onSelect: (filename: string) => void;
}

export function FileList({
  files,
  selectedFilename,
  pendingResult,
  onSelect,
}: FileListProps) {
  return (
    <aside className="w-52 flex-shrink-0 border-r border-white/10 flex flex-col bg-extia-night/30">
      <div className="px-3 pt-3 pb-1">
        <span className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">
          Fichiers
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {files.length === 0 ? (
          <p className="text-white/25 text-xs px-2 py-3">Aucun fichier</p>
        ) : (
          <ul className="space-y-0.5">
            {files.map((f) => {
              const isActive = f.filename === selectedFilename;
              const isModified = pendingResult
                ? pendingResult.files.find((af) => af.filename === f.filename)
                    ?.content !== f.content
                : false;
              return (
                <li key={f.filename}>
                  <button
                    onClick={() => onSelect(f.filename)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all ${
                      isActive
                        ? "bg-extia-yellow/15 text-extia-yellow"
                        : "text-white/55 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <FileCode2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="text-[11px] font-mono truncate flex-1">
                      {f.filename}
                    </span>
                    {isModified && (
                      <span
                        className="w-2 h-2 rounded-full bg-extia-yellow flex-shrink-0"
                        title="Modifié"
                      />
                    )}
                    {isActive && (
                      <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-40" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
