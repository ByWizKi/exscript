import Link from "next/link";
import { GitBranch, Clock, ArrowRight, Pencil } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  draft:    { label: "Brouillon", dot: "bg-slate-400 dark:bg-white/30",          text: "text-slate-500 dark:text-white/40" },
  tested:   { label: "Testé",     dot: "bg-extia-green",                          text: "text-extia-green" },
  deployed: { label: "Déployé",   dot: "bg-extia-yellow",                         text: "text-extia-yellow" },
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
    <div className="group relative">
      <Link href={`/scripts/${script.id}`} className="block">
        <div className="card relative rounded-2xl p-5 transition-all duration-200 hover:border-extia-yellow/50 dark:hover:border-extia-yellow/30">

          {/* Top row */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-heading font-black text-base text-extia-night dark:text-white leading-tight pr-10">
              {script.name}
            </h3>
            <ArrowRight className="h-4 w-4 text-slate-300 dark:text-white/20 group-hover:text-extia-yellow transition-colors flex-shrink-0 mt-0.5" />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-white/35">
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              {script.version_count} version{script.version_count !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {new Date(script.created_at).toLocaleDateString("fr-FR")}
            </span>
          </div>

          {/* Status */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
          </div>
        </div>
      </Link>

      {/* Edit button */}
      <button
        onClick={(e) => { e.preventDefault(); onEdit(); }}
        className="absolute top-4 right-10 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 dark:text-white/30 hover:text-extia-night dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
        title="Modifier"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
