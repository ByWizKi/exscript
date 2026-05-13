"use client";

interface FileDiffProps {
  filename: string;
  before: string;
  after: string;
}

export function FileDiff({ filename, before, after }: FileDiffProps) {
  const changed = before !== after;

  return (
    <div className={`rounded-xl border overflow-hidden ${changed ? "border-extia-yellow/30" : "border-white/10"}`}>
      <div className={`px-4 py-2 flex items-center justify-between ${changed ? "bg-extia-yellow/10" : "bg-white/5"}`}>
        <span className="text-xs font-mono font-medium text-white/70">{filename}</span>
        {changed && <span className="text-xs text-extia-yellow font-medium">Modifié</span>}
      </div>
      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="p-3">
          <p className="text-white/30 text-xs mb-1">Avant</p>
          <pre className="text-xs text-white/60 font-mono whitespace-pre-wrap overflow-auto max-h-64">{before}</pre>
        </div>
        <div className="p-3">
          <p className={`text-xs mb-1 ${changed ? "text-extia-yellow" : "text-white/30"}`}>Après</p>
          <pre className={`text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64 ${changed ? "text-white" : "text-white/60"}`}>{after}</pre>
        </div>
      </div>
    </div>
  );
}
