"use client";

import { memo } from "react";
import { Menu } from "lucide-react";

interface TopbarProps {
  currentPageLabel: string;
  onMobileMenuOpen: () => void;
}

export const Topbar = memo(({ currentPageLabel, onMobileMenuOpen }: TopbarProps) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 shadow-sm flex items-center px-4 gap-3 dark:bg-[#080f1e] dark:border-white/10">
      <button
        type="button"
        onClick={onMobileMenuOpen}
        className="md:hidden p-2 text-slate-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/[0.08] rounded-xl transition-colors"
        title="Open menu"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-slate-800 dark:text-white font-medium text-sm">
        {currentPageLabel}
      </span>
    </header>
  );
});

Topbar.displayName = "Topbar";
