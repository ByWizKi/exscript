"use client";
import React, { useMemo, useRef, useCallback } from "react";
import { diffLines, type Change } from "diff";
import { FileCode2, GitCompare, ArrowLeft, ArrowRight } from "lucide-react";
import type { ScriptFile, ScriptVersion } from "../types";

interface SplitDiffViewerProps {
  oldVersion: ScriptVersion;
  newVersion: ScriptVersion;
  selectedFilename: string | null;
  onSelectFile: (filename: string) => void;
}

interface SplitRow {
  type: "context" | "removed" | "added" | "hunk";
  leftLineNo: number | null;
  rightLineNo: number | null;
  leftContent: string | null;
  rightContent: string | null;
  hidden?: number;
}

const CONTEXT_LINES = 4;

function buildSplitRows(oldContent: string, newContent: string): SplitRow[] {
  const changes: Change[] = diffLines(oldContent, newContent);
  const flat: SplitRow[] = [];
  let leftLine = 1;
  let rightLine = 1;

  // First pass: build removed/added pairs as adjacent blocks
  // Then pair them up into side-by-side rows
  const blocks: { type: "context" | "removed" | "added"; lines: string[] }[] = [];
  for (const change of changes) {
    const lines = change.value.replace(/\n$/, "").split("\n");
    if (change.added) blocks.push({ type: "added", lines });
    else if (change.removed) blocks.push({ type: "removed", lines });
    else blocks.push({ type: "context", lines });
  }

  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.type === "context") {
      for (const line of block.lines) {
        flat.push({ type: "context", leftLineNo: leftLine++, rightLineNo: rightLine++, leftContent: line, rightContent: line });
      }
      i++;
    } else if (block.type === "removed") {
      // Check if next block is added — pair them side by side
      const nextBlock = blocks[i + 1];
      if (nextBlock?.type === "added") {
        const maxLen = Math.max(block.lines.length, nextBlock.lines.length);
        for (let j = 0; j < maxLen; j++) {
          const hasLeft = j < block.lines.length;
          const hasRight = j < nextBlock.lines.length;
          flat.push({
            type: "removed",
            leftLineNo: hasLeft ? leftLine++ : null,
            rightLineNo: hasRight ? rightLine++ : null,
            leftContent: hasLeft ? block.lines[j] : null,
            rightContent: hasRight ? nextBlock.lines[j] : null,
          });
        }
        i += 2;
      } else {
        for (const line of block.lines) {
          flat.push({ type: "removed", leftLineNo: leftLine++, rightLineNo: null, leftContent: line, rightContent: null });
        }
        i++;
      }
    } else {
      // standalone added
      for (const line of block.lines) {
        flat.push({ type: "added", leftLineNo: null, rightLineNo: rightLine++, leftContent: null, rightContent: line });
      }
      i++;
    }
  }

  // Collapse unchanged context
  const changed = new Set<number>();
  flat.forEach((r, idx) => { if (r.type !== "context") changed.add(idx); });

  const visible = new Set<number>();
  changed.forEach((idx) => {
    for (let j = Math.max(0, idx - CONTEXT_LINES); j <= Math.min(flat.length - 1, idx + CONTEXT_LINES); j++) {
      visible.add(j);
    }
  });

  if (changed.size === 0) return [];

  const result: SplitRow[] = [];
  let k = 0;
  while (k < flat.length) {
    if (visible.has(k)) {
      result.push(flat[k]);
      k++;
    } else {
      let j = k;
      while (j < flat.length && !visible.has(j)) j++;
      result.push({ type: "hunk", leftLineNo: null, rightLineNo: null, leftContent: null, rightContent: null, hidden: j - k });
      k = j;
    }
  }
  return result;
}

function DiffCell({ lineNo, content, side, type }: {
  lineNo: number | null;
  content: string | null;
  side: "left" | "right";
  type: "context" | "removed" | "added" | "hunk";
}) {
  const isChanged = type === "removed" || type === "added";
  const isPresent = content !== null;

  const gutterBg = !isPresent
    ? "bg-slate-100 dark:bg-white/[0.02]"
    : type === "removed" && side === "left"
    ? "bg-red-100 dark:bg-red-500/10"
    : type === "added" && side === "right"
    ? "bg-green-100 dark:bg-green-500/10"
    : isChanged
    ? "bg-amber-50 dark:bg-amber-500/[0.06]"
    : "";

  const cellBg = !isPresent
    ? "bg-slate-50 dark:bg-white/[0.015]"
    : type === "removed" && side === "left"
    ? "bg-red-50 dark:bg-red-500/[0.07]"
    : type === "added" && side === "right"
    ? "bg-green-50 dark:bg-green-500/[0.07]"
    : isChanged
    ? "bg-amber-50/50 dark:bg-amber-500/[0.04]"
    : "";

  const textColor = !isPresent
    ? ""
    : type === "removed" && side === "left"
    ? "text-red-700 dark:text-red-300/80"
    : type === "added" && side === "right"
    ? "text-green-700 dark:text-green-300"
    : "text-slate-600 dark:text-white/55";

  const gutterText = !isPresent
    ? ""
    : type === "removed" && side === "left"
    ? "text-red-400 dark:text-red-400/50"
    : type === "added" && side === "right"
    ? "text-green-500 dark:text-green-400/50"
    : "text-slate-300 dark:text-white/20";

  const prefix = side === "left" && type === "removed" && isPresent
    ? "−"
    : side === "right" && type === "added" && isPresent
    ? "+"
    : " ";

  return (
    <>
      <td className={`w-10 text-right pr-2 py-px select-none border-r border-slate-200/50 dark:border-white/[0.05] text-[10px] font-mono ${gutterBg} ${gutterText}`}>
        {lineNo ?? ""}
      </td>
      <td className={`w-4 text-center py-px select-none text-[10px] font-bold ${gutterBg} ${side === "left" ? "text-red-400 dark:text-red-400/60" : "text-green-500 dark:text-green-400/60"}`}>
        {isPresent ? prefix : ""}
      </td>
      <td className={`px-3 py-px whitespace-pre font-mono text-[11px] leading-5 ${cellBg} ${textColor} ${side === "left" ? "border-r border-slate-200 dark:border-white/[0.07]" : ""}`}>
        {content ?? ""}
      </td>
    </>
  );
}

function FileDiff({ oldFile, newFile }: { oldFile: ScriptFile | undefined; newFile: ScriptFile | undefined }) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const onScrollLeft = useCallback(() => {
    if (rightRef.current && leftRef.current) {
      rightRef.current.scrollTop = leftRef.current.scrollTop;
    }
  }, []);

  const onScrollRight = useCallback(() => {
    if (leftRef.current && rightRef.current) {
      leftRef.current.scrollTop = rightRef.current.scrollTop;
    }
  }, []);

  const rows = useMemo(() => {
    if (!oldFile && !newFile) return [];
    return buildSplitRows(oldFile?.content ?? "", newFile?.content ?? "");
  }, [oldFile, newFile]);

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-white/20 text-xs font-mono">
        Fichiers identiques
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left panel */}
      <div ref={leftRef} onScroll={onScrollLeft} className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row, idx) => {
              if (row.type === "hunk") {
                return (
                  <tr key={idx} className="bg-blue-50 dark:bg-blue-400/[0.04]">
                    <td colSpan={3} className="px-3 py-0.5 text-blue-400/70 dark:text-blue-300/40 text-[10px] font-mono">
                      @@ {row.hidden} ligne{(row.hidden ?? 0) > 1 ? "s" : ""} masquée{(row.hidden ?? 0) > 1 ? "s" : ""}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={idx}>
                  <DiffCell lineNo={row.leftLineNo} content={row.leftContent} side="left" type={row.type} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Right panel */}
      <div ref={rightRef} onScroll={onScrollRight} className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <tbody>
            {rows.map((row, idx) => {
              if (row.type === "hunk") {
                return (
                  <tr key={idx} className="bg-blue-50 dark:bg-blue-400/[0.04]">
                    <td colSpan={3} className="px-3 py-0.5 text-blue-400/70 dark:text-blue-300/40 text-[10px] font-mono">
                      @@ {row.hidden} ligne{(row.hidden ?? 0) > 1 ? "s" : ""} masquée{(row.hidden ?? 0) > 1 ? "s" : ""}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={idx}>
                  <DiffCell lineNo={row.rightLineNo} content={row.rightContent} side="right" type={row.type} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SplitDiffViewer({ oldVersion, newVersion, selectedFilename, onSelectFile }: SplitDiffViewerProps) {
  // Collect all unique filenames across both versions
  const allFilenames = useMemo(() => {
    const names = new Set<string>();
    oldVersion.files.forEach((f) => names.add(f.filename));
    newVersion.files.forEach((f) => names.add(f.filename));
    return [...names].sort();
  }, [oldVersion, newVersion]);

  const activeFilename = selectedFilename ?? allFilenames[0] ?? null;
  const oldFile = oldVersion.files.find((f) => f.filename === activeFilename);
  const newFile = newVersion.files.find((f) => f.filename === activeFilename);

  return (
    <section className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-slate-200 dark:border-white/10">
      {/* Version header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] flex-shrink-0">
        <GitCompare className="h-3.5 w-3.5 text-extia-night dark:text-extia-yellow flex-shrink-0" />
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-red-500 dark:text-red-400/80 font-semibold">v{oldVersion.version_number}</span>
          <ArrowRight className="h-3 w-3 text-slate-300 dark:text-white/20" />
          <span className="text-green-600 dark:text-green-400 font-semibold">v{newVersion.version_number} (actuelle)</span>
        </div>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400 dark:text-white/30 truncate max-w-xs">
          {oldVersion.message}
        </span>
      </div>

      {/* Split header labels */}
      <div className="flex border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2 px-4 py-1.5 bg-red-50/60 dark:bg-red-500/[0.04] border-r border-slate-200 dark:border-white/10">
          <ArrowLeft className="h-3 w-3 text-red-400" />
          <span className="text-[10px] text-red-500 dark:text-red-400/70 font-semibold">
            v{oldVersion.version_number} — {new Date(oldVersion.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-4 py-1.5 bg-green-50/60 dark:bg-green-500/[0.04]">
          <ArrowRight className="h-3 w-3 text-green-500" />
          <span className="text-[10px] text-green-600 dark:text-green-400/70 font-semibold">
            v{newVersion.version_number} (actuelle) — {new Date(newVersion.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* File tabs */}
      <div className="flex gap-0 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-extia-night/20 overflow-x-auto flex-shrink-0 scrollbar-thin">
        {allFilenames.map((name) => {
          const isActive = name === activeFilename;
          const oldContent = oldVersion.files.find((f) => f.filename === name)?.content ?? "";
          const newContent = newVersion.files.find((f) => f.filename === name)?.content ?? "";
          const hasChanges = oldContent !== newContent;
          return (
            <button
              key={name}
              onClick={() => onSelectFile(name)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono border-r border-slate-200 dark:border-white/[0.07] flex-shrink-0 transition-colors ${
                isActive
                  ? "bg-white dark:bg-extia-night text-extia-night dark:text-extia-yellow border-b-2 border-b-extia-night dark:border-b-extia-yellow"
                  : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70 hover:bg-white/60 dark:hover:bg-white/[0.03]"
              }`}
            >
              <FileCode2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{name}</span>
              {hasChanges && (
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-extia-night dark:bg-extia-yellow" : "bg-slate-400 dark:bg-white/30"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Diff content */}
      {activeFilename ? (
        <FileDiff oldFile={oldFile} newFile={newFile} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-white/20 text-sm">
          Sélectionne un fichier
        </div>
      )}
    </section>
  );
}
