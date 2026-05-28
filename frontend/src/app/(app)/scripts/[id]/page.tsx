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
import type {
  Script,
  AiResult,
  ChatMessage,
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
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  useEffect(() => {
    fetchScript();
  }, [fetchScript]);

  const currentFiles = script?.latest_version?.files ?? [];
  const selectedFile = selectedFilename
    ? currentFiles.find((f) => f.filename === selectedFilename) ?? null
    : null;
  const previewContent = pendingResult
    ? pendingResult.files.find((f) => f.filename === selectedFilename)?.content ??
      null
    : null;

  const handleSend = async (overridePrompt?: string) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text || aiLoading || !session?.backendToken) return;

    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setAiLoading(true);

    try {
      const history = messages
        .filter((m: ChatMessage) => !m.error)
        .map((m: ChatMessage) => ({
          role: m.role,
          content: m.text,
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
            prompt: text,
            google_access_token: session.googleAccessToken,
            history,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Erreur serveur");

      const result: AiResult = data;
      setPendingResult(result);

      const firstMod = result.files.find(
        (f) =>
          f.content !==
          currentFiles.find((cf) => cf.filename === f.filename)?.content
      );
      if (firstMod) setSelectedFilename(firstMod.filename);

      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          role: "assistant" as const,
          text: result.version_message,
          result,
        },
      ]);
      setShowVersionModal(true);
    } catch (e) {
      setMessages((prev: ChatMessage[]) => [
        ...prev,
        {
          role: "assistant" as const,
          text: "",
          error:
            e instanceof Error ? e.message : "Erreur inconnue",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
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
        `${process.env.NEXT_PUBLIC_API_URL}/scripts/${id}/pull`,
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

      setPulled(true);
      setTimeout(() => setPulled(false), 3000);
      await fetchScript();
    } catch (e) {
      setPullError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setPulling(false);
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
        <Loader2 className="h-6 w-6 animate-spin text-extia-yellow" />
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
      />

      <div className="flex flex-1 min-h-0">
        <FileList
          files={currentFiles}
          selectedFilename={selectedFilename}
          pendingResult={pendingResult}
          onSelect={setSelectedFilename}
        />

        <CodeViewer
          selectedFile={selectedFile}
          previewContent={previewContent}
          pendingResult={pendingResult}
        />

        <AiChat
          messages={messages}
          aiLoading={aiLoading}
          currentFiles={currentFiles}
          onSend={handleSend}
          onSelectFile={(filename, result) => {
            setSelectedFilename(filename);
            setPendingResult(result);
          }}
          prompt={prompt}
          onPromptChange={setPrompt}
        />
      </div>

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

