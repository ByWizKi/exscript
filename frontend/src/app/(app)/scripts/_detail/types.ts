export interface ScriptFile {
  id: number;
  filename: string;
  content: string;
  file_type: string;
}

export interface ScriptVersion {
  id: number;
  version_number: number;
  message: string;
  status: string;
  created_by: string;
  created_at: string;
  files: ScriptFile[];
}

export interface Script {
  id: number;
  name: string;
  gas_script_id: string;
  spreadsheet_id: string;
  latest_version: ScriptVersion | null;
  versions: ScriptVersion[];
}

export interface AiFile {
  filename: string;
  content: string;
  file_type: string;
}

export interface AiStep {
  type: "generating" | "validating" | "fixing" | "done" | "warning";
  message: string;
}

export interface AiResult {
  files: AiFile[];
  version_message: string;
  steps?: AiStep[];
  validation_warnings?: string[];
}

export interface ChatMessageDB {
  id: number;
  role: "user" | "assistant";
  content: string;
  message_type: "user" | "clarification" | "result" | "error" | "message";
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface AiClarification {
  type: "modification" | "explanation";
  feasible: boolean;
  reformulation: string;
  explanation: string;
  files_affected: string[];
  plan: string[];
  original_prompt: string;
  confirmed: boolean | null; // null = en attente, true = confirmé, false = annulé
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  result?: AiResult;
  error?: string;
  message?: string;
  clarification?: AiClarification;
}
