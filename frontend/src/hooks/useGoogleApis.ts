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

const GAS_BASE = "https://script.googleapis.com/v1";
const DRIVE_BASE = "https://www.googleapis.com/drive/v3";

async function get<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: { message?: string } })?.error?.message ?? `Google API error ${res.status}`
    );
  }
  return res.json() as Promise<T>;
}

export async function fetchGasProjects(token: string): Promise<GasProject[]> {
  const data = await get<{ projects?: Array<{ scriptId: string; title: string; parentId?: string }> }>(
    `${GAS_BASE}/projects`,
    token
  );
  return (data.projects ?? []).map((p) => ({
    scriptId: p.scriptId,
    title: p.title,
    parentId: p.parentId,
  }));
}

export async function fetchGasFiles(token: string, scriptId: string): Promise<GasFile[]> {
  const data = await get<{ files?: Array<{ name: string; type: string; source: string }> }>(
    `${GAS_BASE}/projects/${scriptId}/content`,
    token
  );
  return (data.files ?? [])
    .filter((f) => f.source !== undefined)
    .map((f) => ({
      name: f.name,
      type: f.type as GasFile["type"],
      source: f.source,
    }));
}

export async function fetchSheets(token: string): Promise<DriveSheet[]> {
  const data = await get<{ files?: Array<{ id: string; name: string }> }>(
    `${DRIVE_BASE}/files?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'&fields=files(id%2Cname)&pageSize=100`,
    token
  );
  return (data.files ?? []).map((f) => ({ id: f.id, name: f.name }));
}
