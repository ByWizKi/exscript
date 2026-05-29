"use client";
import { useMemo } from "react";
import { diffLines, type Change } from "diff";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
}

interface DiffLine {
  type: "added" | "removed" | "context";
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

const CONTEXT_LINES = 4;

function computeDiffLines(oldContent: string, newContent: string): DiffLine[] {
  const changes: Change[] = diffLines(oldContent, newContent);
  const result: DiffLine[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, "").split("\n");
    if (change.added) {
      for (const line of lines) {
        result.push({ type: "added", content: line, oldLineNo: null, newLineNo: newLine++ });
      }
    } else if (change.removed) {
      for (const line of lines) {
        result.push({ type: "removed", content: line, oldLineNo: oldLine++, newLineNo: null });
      }
    } else {
      for (const line of lines) {
        result.push({ type: "context", content: line, oldLineNo: oldLine++, newLineNo: newLine++ });
      }
    }
  }

  return result;
}

function collapseContext(lines: DiffLine[]): (DiffLine | { type: "hunk"; hidden: number })[] {
  const changed = new Set<number>();
  lines.forEach((l, i) => {
    if (l.type !== "context") changed.add(i);
  });

  const visible = new Set<number>();
  changed.forEach((i) => {
    for (let j = Math.max(0, i - CONTEXT_LINES); j <= Math.min(lines.length - 1, i + CONTEXT_LINES); j++) {
      visible.add(j);
    }
  });

  const result: (DiffLine | { type: "hunk"; hidden: number })[] = [];
  let i = 0;
  while (i < lines.length) {
    if (visible.has(i)) {
      result.push(lines[i]);
      i++;
    } else {
      let j = i;
      while (j < lines.length && !visible.has(j)) j++;
      result.push({ type: "hunk", hidden: j - i });
      i = j;
    }
  }
  return result;
}

export function DiffViewer({ oldContent, newContent }: DiffViewerProps) {
  const rows = useMemo(() => {
    const lines = computeDiffLines(oldContent, newContent);
    return collapseContext(lines);
  }, [oldContent, newContent]);

  const hasChanges = rows.some((r) => "type" in r && (r.type === "added" || r.type === "removed"));

  if (!hasChanges) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-white/30 text-xs font-mono">
        Aucune modification dans ce fichier
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto scrollbar-thin font-mono text-[11px] leading-5">
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((row, idx) => {
            if (row.type === "hunk") {
              return (
                <tr key={idx} className="bg-blue-500/10 dark:bg-blue-400/5">
                  <td className="w-10 text-center text-blue-400/60 dark:text-blue-300/30 select-none py-0.5 border-r border-blue-500/20 text-[10px]">
                    ···
                  </td>
                  <td className="w-10 text-center text-blue-400/60 dark:text-blue-300/30 select-none py-0.5 border-r border-blue-500/20 text-[10px]">
                    ···
                  </td>
                  <td className="w-6 select-none" />
                  <td className="px-3 py-0.5 text-blue-400/70 dark:text-blue-300/40 text-[10px]">
                    @@ {row.hidden} ligne{row.hidden > 1 ? "s" : ""} masquée{row.hidden > 1 ? "s" : ""}
                  </td>
                </tr>
              );
            }

            const line = row as DiffLine;

            const rowBg =
              line.type === "added"
                ? "bg-green-500/10 dark:bg-green-400/[0.08]"
                : line.type === "removed"
                  ? "bg-red-500/10 dark:bg-red-400/[0.08]"
                  : "";

            const gutter =
              line.type === "added"
                ? "bg-green-500/20 dark:bg-green-400/10 text-green-600 dark:text-green-400/60"
                : line.type === "removed"
                  ? "bg-red-500/20 dark:bg-red-400/10 text-red-600 dark:text-red-400/60"
                  : "text-slate-300 dark:text-white/20";

            const prefix =
              line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";

            const prefixColor =
              line.type === "added"
                ? "text-green-500 dark:text-green-400"
                : line.type === "removed"
                  ? "text-red-500 dark:text-red-400"
                  : "text-slate-300 dark:text-white/20";

            const textColor =
              line.type === "added"
                ? "text-green-800 dark:text-green-300"
                : line.type === "removed"
                  ? "text-red-800 dark:text-red-300/80 line-through decoration-red-400/40"
                  : "text-slate-600 dark:text-white/50";

            return (
              <tr key={idx} className={`group ${rowBg}`}>
                <td className={`w-10 text-right pr-2 py-px select-none border-r border-slate-200/50 dark:border-white/[0.06] ${gutter}`}>
                  {line.oldLineNo ?? ""}
                </td>
                <td className={`w-10 text-right pr-2 py-px select-none border-r border-slate-200/50 dark:border-white/[0.06] ${gutter}`}>
                  {line.newLineNo ?? ""}
                </td>
                <td className={`w-6 text-center py-px select-none font-bold ${prefixColor}`}>
                  {prefix}
                </td>
                <td className={`px-3 py-px whitespace-pre ${textColor}`}>
                  {line.content || " "}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
