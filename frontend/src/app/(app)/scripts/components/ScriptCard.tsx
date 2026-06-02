import Link from "next/link";
import { GitBranch, Clock, ArrowRight, Pencil } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:    { label: "Brouillon", bg: "bg-slate-100 dark:bg-white/[0.06]",        text: "text-slate-500 dark:text-white/40",  dot: "bg-slate-400 dark:bg-white/30" },
  tested:   { label: "Testé",     bg: "bg-green-50 dark:bg-green-500/10",          text: "text-green-700 dark:text-green-400", dot: "bg-green-500" },
  deployed: { label: "Déployé",   bg: "bg-extia-yellow/10 dark:bg-extia-yellow/10", text: "text-extia-yellow",                dot: "bg-extia-yellow" },
};

interface Props {
  script: {
    id: number;
    name: string;
    gas_script_id: string;
    spreadsheet_id: string;
    version_count: number;
    latest_status: string | null;
    created_at: string;
  };
  onEdit: () => void;
}

export function ScriptCard({ script, onEdit }: Props) {
  const status = script.latest_status ?? "draft";
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <div className="group relative flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.025] transition-colors">

      {/* Status dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

      {/* Name + ID */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/scripts/${script.id}`}
          className="font-semibold text-sm text-extia-night dark:text-white hover:text-extia-yellow dark:hover:text-extia-yellow transition-colors leading-tight block truncate"
        >
          {script.name}
        </Link>
        <span className="text-[11px] font-mono text-slate-400 dark:text-white/25 truncate block mt-0.5">
          {script.gas_script_id}
        </span>
      </div>

      {/* Version count */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-white/30 flex-shrink-0 hidden sm:flex">
        <GitBranch className="h-3.5 w-3.5" />
        <span>{script.version_count} version{script.version_count !== 1 ? "s" : ""}</span>
      </div>

      {/* Status badge */}
      <span className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>

      {/* Date */}
      <span className="text-xs text-slate-300 dark:text-white/20 flex-shrink-0 hidden lg:flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        {new Date(script.created_at).toLocaleDateString("fr-FR")}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); onEdit(); }}
          className="p-1.5 rounded-lg text-slate-300 dark:text-white/20 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
          title="Modifier"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <Link
          href={`/scripts/${script.id}`}
          className="p-1.5 rounded-lg text-slate-300 dark:text-white/20 hover:text-extia-yellow transition-colors"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
