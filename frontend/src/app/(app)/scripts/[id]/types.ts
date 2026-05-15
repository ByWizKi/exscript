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
  created_at: string;
  files: ScriptFile[];
}

export interface Script {
  id: number;
  name: string;
  gas_script_id: string;
  spreadsheet_id: string;
  latest_version: ScriptVersion | null;
}

export interface AiFile {
  filename: string;
  content: string;
  file_type: string;
}

export interface AiResult {
  files: AiFile[];
  version_message: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  result?: AiResult;
  error?: string;
}
