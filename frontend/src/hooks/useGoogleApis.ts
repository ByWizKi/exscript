export interface GasProject {
  scriptId: string;
  title: string;
  parentId?: string;
}

export interface GasFile {
  name: string;
  type: "SERVER_JS" | "HTML" | "JSON";
  source: string;
}

export interface DriveSheet {
  id: string;
  name: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchGasProjects(googleToken: string): Promise<GasProject[]> {
  return get<GasProject[]>(`/google/projects?access_token=${encodeURIComponent(googleToken)}`);
}

export async function fetchGasFiles(googleToken: string, scriptId: string): Promise<GasFile[]> {
  return get<GasFile[]>(`/google/projects/${scriptId}/files?access_token=${encodeURIComponent(googleToken)}`);
}

export async function fetchSheets(googleToken: string): Promise<DriveSheet[]> {
  return get<DriveSheet[]>(`/google/sheets?access_token=${encodeURIComponent(googleToken)}`);
}
