"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch, Clock, MoreHorizontal } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  draft:    { label: "Brouillon", bg: "bg-slate-100 dark:bg-white/[0.06]",          text: "text-slate-500 dark:text-white/40",  border: "border-slate-200 dark:border-white/10",      dot: "bg-slate-400" },
  tested:   { label: "Testé",     bg: "bg-green-50 dark:bg-green-400/10",            text: "text-green-600 dark:text-green-400", border: "border-green-200 dark:border-green-400/20",  dot: "bg-green-500" },
  deployed: { label: "Déployé",   bg: "bg-extia-yellow/10 dark:bg-extia-yellow/10", text: "text-extia-yellow",                  border: "border-extia-yellow/20",                     dot: "bg-extia-yellow" },
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
  mobile?: boolean;
}

export function ScriptRow({ script, onEdit, mobile = false }: Props) {
  const router = useRouter();
  const status = script.latest_status ?? "draft";
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const date = new Date(script.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  const badge = (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );

  if (mobile) {
    return (
      <Link
        href={`/scripts/${script.id}`}
        className="block w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">{script.name}</p>
          <span className="shrink-0">{badge}</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-slate-400 dark:text-white/30">Identifiant</dt>
          <dd className="text-slate-600 dark:text-white/60 truncate font-mono">{script.gas_script_id}</dd>
          <dt className="text-slate-400 dark:text-white/30">Versions</dt>
          <dd className="text-slate-600 dark:text-white/60">{script.version_count}</dd>
          <dt className="text-slate-400 dark:text-white/30">Créé le</dt>
          <dd className="text-slate-500 dark:text-white/40">{date}</dd>
        </dl>
      </Link>
    );
  }

  return (
    <tr
      onClick={() => router.push(`/scripts/${script.id}`)}
      className="border-b border-slate-100 dark:border-white/[0.05] hover:bg-extia-yellow/[0.02] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
    >
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[220px] group-hover:text-extia-yellow transition-colors">
          {script.name}
        </p>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs font-mono text-slate-400 dark:text-white/30 truncate max-w-[160px] block">{script.gas_script_id}</span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-white/60">
          <GitBranch className="h-3.5 w-3.5 text-slate-400 dark:text-white/30" />
          {script.version_count}
        </div>
      </td>
      <td className="py-3 px-4">{badge}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/40 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {date}
        </div>
      </td>
      <td className="py-3 px-4">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-white/30 hover:text-slate-700 dark:hover:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
          title="Modifier"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
