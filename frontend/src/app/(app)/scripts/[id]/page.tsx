"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { TopBar } from "../_detail/components/TopBar";
import { FileList } from "../_detail/components/FileList";
import { CodeViewer } from "../_detail/components/CodeViewer";
import { AiChat } from "../_detail/components/AiChat";
import { CreateVersionModal } from "../_detail/components/CreateVersionModal";
import { PullPreviewModal } from "../_detail/components/PullPreviewModal";
import { VersionHistory } from "../_detail/components/VersionHistory";
import { SplitDiffViewer } from "../_detail/components/SplitDiffViewer";
import type {
  Script,
  ScriptVersion,
  AiResult,
  AiClarification,
  ChatMessage,
  ChatMessageDB,
} from "../_detail/types";

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();

  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<AiResult | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushed, setPushed] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [pulled, setPulled] = useState(false);
  const [pullPreviewFiles, setPullPreviewFiles] = useState<{ filename: string; content: string; file_type: string }[] | null>(null);
  const [pullApplying, setPullApplying] = useState(false);
  const [pullApplyError, setPullApplyError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sidebarTab, setSidebarTab] = useState<"files" | "history">("files");
  const [viewingVersion, setViewingVersion] = useState<ScriptVersion | null>(null);
  const [restoring, setRestoring] = useState(false);

  const fetchScript = useCallback(async () => {
    if (!session?.backendToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}`,
        {
          headers: { Authorization: `Bearer ${session.backendToken}` },
        }
      );
      if (res.ok) {
        const data: Script = await res.json();
        setScript(data);
        if (data.latest_version?.files?.length) {
          setSelectedFilename((prev) =>
            prev &&
            data.latest_version!.files.find((f) => f.filename === prev)
              ? prev
              : data.latest_version!.files[0].filename
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, session?.backendToken]);

  const fetchChatHistory = useCallback(async () => {
    if (!session?.backendToken) return;
    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/chat`,
        { headers: { Authorization: `Bearer ${session.backendToken}` } }
      );
      if (!res.ok) return;
      const history: ChatMessageDB[] = await res.json();
      const loaded: ChatMessage[] = history.map((m) => {
        if (m.role === "user") return { role: "user" as const, text: m.content };
        if (m.message_type === "clarification" && m.metadata_json) {
          const c = m.metadata_json as Record<string, unknown>;
          return {
            role: "assistant" as const,
            text: "",
            clarification: {
              type: (c.type as "modification" | "explanation") ?? "modification",
              feasible: (c.feasible as boolean) ?? true,
              reformulation: (c.reformulation as string) ?? "",
              explanation: (c.explanation as string) ?? "",
              files_affected: (c.files_affected as string[]) ?? [],
              plan: (c.plan as string[]) ?? [],
              original_prompt: "",
              confirmed: false,
            } satisfies AiClarification,
          };
        }
        if (m.message_type === "result" && m.metadata_json) {
          const r = m.metadata_json as Record<string, unknown>;
          const result = r as unknown as AiResult;
          return {
            role: "assistant" as const,
            text: (r.version_message as string) ?? "",
            result,
          };
        }
        return { role: "assistant" as const, text: m.content };
      });
      setMessages(loaded);
    } catch {
      // ignore — history is best-effort
    }
  }, [id, session?.backendToken]);

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  const currentFiles = viewingVersion
    ? viewingVersion.files
    : script?.latest_version?.files ?? [];
  const selectedFile = selectedFilename
    ? currentFiles.find((f) => f.filename === selectedFilename) ?? null
    : null;
  const previewContent = pendingResult
    ? pendingResult.files.find((f) => f.filename === selectedFilename)?.content ??
      null
    : viewingVersion && script?.latest_version
    ? (script.latest_version.files.find((f) => f.filename === selectedFilename)?.content ?? null)
    : null;

  const handleViewVersion = (version: ScriptVersion) => {
    setViewingVersion(version);
    const firstFile = version.files[0]?.filename ?? null;
    if (firstFile) setSelectedFilename(firstFile);
  };

  const handleRestore = async (version: ScriptVersion) => {
    if (!session?.backendToken) return;
    setRestoring(true);
    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/restore/${version.id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.backendToken}` },
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }
      setViewingVersion(null);
      setSidebarTab("files");
      await fetchScript();
    } catch {
      // ignore — could add error state if needed
    } finally {
      setRestoring(false);
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text || aiLoading || !session?.backendToken) return;

    setPrompt("");
    setMessages((prev) => [
      ...prev.map((m) =>
        m.clarification?.confirmed === null
          ? { ...m, clarification: { ...m.clarification, confirmed: false as const } }
          : m
      ),
      { role: "user" as const, text },
    ]);
    setAiLoading(true);

    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/ai-clarify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({
            prompt: text,
            google_access_token: session.googleAccessToken,
            history: messages
              .filter((m: ChatMessage) => !m.error)
              .map((m: ChatMessage) => ({
                role: m.role,
                content: m.clarification
                  ? `[Analyse IA] ${m.clarification.reformulation || m.clarification.explanation}`
                  : m.text,
              })),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");

      const isExplanation = data.type === "explanation";
      const clarification: AiClarification = {
        type: data.type ?? "modification",
        feasible: data.feasible ?? true,
        reformulation: data.reformulation ?? "",
        explanation: data.explanation ?? "",
        files_affected: data.files_affected ?? [],
        plan: data.plan ?? [],
        original_prompt: text,
        confirmed: (isExplanation || data.feasible === false) ? false : null,
      };

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "assistant" as const, text: "", clarification },
      ]);
    } catch (e) {
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          role: "assistant" as const,
          text: "",
          error: e instanceof Error ? e.message : "Erreur inconnue",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleConfirm = async (originalPrompt: string) => {
    if (aiLoading || !session?.backendToken) return;

    setMessages((prev: ChatMessage[]) =>
      prev.map((m) =>
        m.clarification?.original_prompt === originalPrompt && m.clarification.confirmed === null
          ? { ...m, clarification: { ...m.clarification, confirmed: true } }
          : m
      )
    );
    setAiLoading(true);

    try {
      const history = messages
        .filter((m: ChatMessage) => !m.error)
        .map((m: ChatMessage) => ({
          role: m.role,
          content: m.clarification
            ? `[Analyse IA] ${m.clarification.reformulation || m.clarification.explanation}`
            : m.text,
        }));

      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/ai-modify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({
            prompt: originalPrompt,
            google_access_token: session.googleAccessToken,
            history,
            base_files: pendingResult?.files ?? null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");

      const result: AiResult = data;
      setPendingResult(result);

      const firstMod = result.files.find(
        (f) => f.content !== currentFiles.find((cf) => cf.filename === f.filename)?.content
      );
      if (firstMod) setSelectedFilename(firstMod.filename);

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        { role: "assistant" as const, text: result.version_message, result },
      ]);
    } catch (e) {
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          role: "assistant" as const,
          text: "",
          error: e instanceof Error ? e.message : "Erreur inconnue",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDocument = async () => {
    if (aiLoading || !session?.backendToken) return;
    setAiLoading(true);
    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/ai-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({ prompt: "", base_files: pendingResult?.files ?? null }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");
      const result: AiResult = data;
      setPendingResult(result);
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, text: result.version_message, result },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant" as const, text: "", error: e instanceof Error ? e.message : "Erreur inconnue" },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!session?.backendToken) return;
    try {
      await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/chat`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session.backendToken}` },
        }
      );
      setMessages([]);
    } catch {
      // ignore
    }
  };

  const handleCancelClarification = () => {
    setMessages((prev: ChatMessage[]) =>
      prev.map((m) =>
        m.clarification?.confirmed === null
          ? { ...m, clarification: { ...m.clarification, confirmed: false } }
          : m
      )
    );
  };

  const handleApply = async (message: string) => {
    if (!pendingResult || !session?.backendToken) return;

    setApplying(true);
    setApplyError(null);

    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({
            files: pendingResult.files,
            message,
          }),
        }
      );

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }

      setShowVersionModal(false);
      setPendingResult(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
      await fetchScript();
    } catch (e) {
      setApplyError(
        e instanceof Error ? e.message : "Erreur inconnue"
      );
    } finally {
      setApplying(false);
    }
  };

  const handleApplyAndPush = async (message: string) => {
    if (
      !pendingResult ||
      !session?.backendToken ||
      !session?.googleAccessToken
    )
      return;

    setApplying(true);
    setApplyError(null);

    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({
            files: pendingResult.files,
            message,
          }),
        }
      );

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }

      setShowVersionModal(false);
      setPendingResult(null);
      await fetchScript();
      await handlePush();
    } catch (e) {
      setApplyError(
        e instanceof Error ? e.message : "Erreur inconnue"
      );
    } finally {
      setApplying(false);
    }
  };

  const handlePull = async () => {
    if (!session?.googleAccessToken || !session?.backendToken) return;

    setPulling(true);
    setPullError(null);

    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/pull-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({ access_token: session.googleAccessToken }),
        }
      );

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur pull");
      }

      const files = await res.json();
      setPullPreviewFiles(files);
    } catch (e) {
      setPullError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setPulling(false);
    }
  };

  const handlePullConfirm = async (message: string) => {
    if (!pullPreviewFiles || !session?.backendToken) return;

    setPullApplying(true);
    setPullApplyError(null);

    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/versions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({ files: pullPreviewFiles, message }),
        }
      );

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur serveur");
      }

      setPullPreviewFiles(null);
      setPulled(true);
      setTimeout(() => setPulled(false), 3000);
      await fetchScript();
    } catch (e) {
      setPullApplyError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setPullApplying(false);
    }
  };

  const handlePush = async () => {
    if (!session?.googleAccessToken) return;

    setPushing(true);
    setPushError(null);

    try {
      const res = await apiFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/push`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.backendToken}`,
          },
          body: JSON.stringify({ access_token: session.googleAccessToken }),
        }
      );

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail ?? "Erreur push");
      }

      setPushed(true);
      setTimeout(() => setPushed(false), 3000);
    } catch (e) {
      setPushError(
        e instanceof Error ? e.message : "Erreur inconnue"
      );
    } finally {
      setPushing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-extia-night dark:text-extia-yellow" />
      </div>
    );
  }

  if (!script) {
    return <div className="p-8 text-white/50">Script introuvable.</div>;
  }

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <TopBar
        script={script}
        pendingResult={pendingResult}
        applied={applied}
        pushing={pushing}
        pushed={pushed}
        pulling={pulling}
        pulled={pulled}
        pushError={pushError}
        pullError={pullError}
        hasGoogleToken={!!session?.googleAccessToken}
        onPush={handlePush}
        onPull={handlePull}
        onCreateVersion={() => setShowVersionModal(true)}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex flex-col w-52 flex-shrink-0">
          <div className="flex h-[38px] border-b border-r border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-extia-night/30">
            <button
              onClick={() => { setSidebarTab("files"); setViewingVersion(null); }}
              className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                sidebarTab === "files"
                  ? "text-extia-night dark:text-extia-yellow border-b-2 border-extia-night dark:border-extia-yellow"
                  : "text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60"
              }`}
            >
              Fichiers
            </button>
            <button
              onClick={() => setSidebarTab("history")}
              className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                sidebarTab === "history"
                  ? "text-extia-night dark:text-extia-yellow border-b-2 border-extia-night dark:border-extia-yellow"
                  : "text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60"
              }`}
            >
              Historique
            </button>
          </div>
          {sidebarTab === "files" ? (
            <FileList
              files={currentFiles}
              selectedFilename={selectedFilename}
              pendingResult={pendingResult}
              onSelect={setSelectedFilename}
            />
          ) : (
            <VersionHistory
              versions={script.versions}
              currentVersionId={script.latest_version?.id}
              viewingVersionId={viewingVersion?.id ?? null}
              restoring={restoring}
              onView={handleViewVersion}
              onRestore={handleRestore}
            />
          )}
        </div>

        {viewingVersion && script.latest_version ? (
          <SplitDiffViewer
            oldVersion={viewingVersion}
            newVersion={script.latest_version}
            selectedFilename={selectedFilename}
            onSelectFile={setSelectedFilename}
          />
        ) : (
          <CodeViewer
            selectedFile={selectedFile}
            previewContent={previewContent}
            pendingResult={pendingResult}
          />
        )}

        <AiChat
          messages={messages}
          aiLoading={aiLoading}
          currentFiles={currentFiles}
          onSend={handleSend}
          onSelectFile={(filename, result) => {
            setSelectedFilename(filename);
            setPendingResult(result);
          }}
          onConfirm={handleConfirm}
          onCancelClarification={handleCancelClarification}
          onDocument={handleDocument}
          onClearChat={handleClearChat}
          prompt={prompt}
          onPromptChange={setPrompt}
        />
      </div>

      {pullPreviewFiles && (
        <PullPreviewModal
          pulledFiles={pullPreviewFiles}
          currentFiles={currentFiles}
          applying={pullApplying}
          error={pullApplyError}
          onConfirm={handlePullConfirm}
          onDiscard={() => { setPullPreviewFiles(null); setPullApplyError(null); }}
        />
      )}

      {showVersionModal && pendingResult && (
        <CreateVersionModal
          result={pendingResult}
          currentFiles={currentFiles}
          hasGoogleToken={!!session?.googleAccessToken}
          applying={applying}
          error={applyError}
          onApply={handleApply}
          onApplyAndPush={handleApplyAndPush}
          onDiscard={() => { setShowVersionModal(false); setPendingResult(null); }}
        />
      )}
    </div>
  );
}

