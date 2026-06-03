"use client";

import React from "react";
import { PROMPT_TEMPLATES, PROMPT_CATEGORIES } from "../data/promptTemplates";

interface PromptLibraryProps {
  onSelect: (template: string) => void;
  onClose: () => void;
}

export function PromptLibrary({ onSelect, onClose }: PromptLibraryProps) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-extia-night border border-slate-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-10">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/10">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50 uppercase tracking-wide">
          Prompts types
        </span>
        <button
          onClick={onClose}
          className="text-slate-300 dark:text-white/30 hover:text-slate-500 dark:hover:text-white/60 text-xs transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="overflow-y-auto max-h-64 scrollbar-thin">
        {PROMPT_CATEGORIES.map((category) => (
          <div key={category}>
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03]">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-white/30 uppercase tracking-wide">
                {category}
              </span>
            </div>
            {PROMPT_TEMPLATES.filter((p) => p.category === category).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelect(p.template);
                  onClose();
                }}
                className="w-full text-left px-3 py-2 text-[11px] text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-extia-night dark:hover:text-white transition-colors border-b border-slate-50 dark:border-white/[0.04] last:border-0"
              >
                {p.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
