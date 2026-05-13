import { Code2, Sheet, GitBranch, Clock } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  draft:    "bg-white/10 text-white/60 border-white/20",
  tested:   "bg-extia-green/20 text-extia-green border-extia-green/30",
  deployed: "bg-extia-yellow/20 text-extia-yellow border-extia-yellow/30",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", tested: "Testé", deployed: "Déployé",
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
}

export function ScriptCard({ script }: Props) {
  const status = script.latest_status ?? "draft";
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-extia-yellow/30 transition-all duration-200 hover:shadow-lg hover:shadow-extia-yellow/5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-extia-yellow/10 flex items-center justify-center flex-shrink-0">
            <Code2 className="h-5 w-5 text-extia-yellow" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{script.name}</h3>
            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border mt-1 ${STATUS_STYLE[status]}`}>
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-white/40 text-xs">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{script.version_count}v</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Code2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-mono truncate">{script.gas_script_id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Sheet className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-mono truncate">{script.spreadsheet_id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Clock className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{new Date(script.created_at).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>
    </div>
  );
}
