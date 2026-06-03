from __future__ import annotations

import json
import re

from sqlalchemy.ext.asyncio import AsyncSession

from .crud import get_script


async def _fetch_sheets_context(spreadsheet_id: str, access_token: str) -> str:
    import httpx

    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}",
            params={"includeGridData": "true"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
    if not r.is_success:
        return ""

    data = r.json()
    lines = [f"Spreadsheet: {data.get('properties', {}).get('title', spreadsheet_id)}"]

    for sheet in data.get("sheets", []):
        props = sheet.get("properties", {})
        title = props.get("title", "Sheet")
        lines.append(f"\n## Feuille : {title}")

        grid_data = sheet.get("data", [])
        if not grid_data:
            continue

        rows = grid_data[0].get("rowData", [])
        if not rows:
            continue

        table_rows = []
        for row in rows:
            cells = row.get("values", [])
            row_vals = [c.get("formattedValue", "") or "" for c in cells]
            # Trim trailing empty cells
            while row_vals and row_vals[-1] == "":
                row_vals.pop()
            if any(row_vals):
                table_rows.append(row_vals)

        if not table_rows:
            continue

        # First row as headers
        max_cols = max(len(r) for r in table_rows)
        headers = table_rows[0] + [""] * (max_cols - len(table_rows[0]))
        lines.append("Colonnes : " + " | ".join(headers))
        lines.append(f"Nombre de lignes de données : {len(table_rows) - 1}")

        # Show up to 5 sample rows
        for row in table_rows[1:6]:
            row += [""] * (max_cols - len(row))
            lines.append("  " + " | ".join(row))
        if len(table_rows) > 6:
            lines.append(f"  ... ({len(table_rows) - 6} lignes supplémentaires)")

    return "\n".join(lines)


async def ai_modify_script(
    script_id: int,
    prompt: str,
    db: AsyncSession,
    google_access_token: str | None = None,
    history: list | None = None,
) -> dict:
    from app.llm.base import LLMMessage
    from app.llm.factory import get_provider

    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    latest = script.versions[0] if script.versions else None
    if not latest or not latest.files:
        raise ValueError("No files found in the latest version")

    files_context = "\n\n".join(
        f"### {f.filename}\n```javascript\n{f.content}\n```" for f in latest.files
    )

    sheets_context = ""
    if google_access_token and script.spreadsheet_id:
        sheets_context = await _fetch_sheets_context(script.spreadsheet_id, google_access_token)

    file_count = len(latest.files)
    file_list = ", ".join(f.filename for f in latest.files)
    project_name = script.name

    system_prompt = f"""You are an expert Google Apps Script (GAS) developer embedded inside ExScript, \
a versioning and AI-editing tool for GAS projects. You function like an IDE-integrated AI assistant \
(think GitHub Copilot or Claude Code) — you have full access to every file in the project and you \
reason about the whole codebase before making any change.

## Your project context
- Project name: {project_name}
- Files ({file_count}): {file_list}

## Google Apps Script constraints you must always respect
- There is NO module system: no `import`, no `require`, no `export`. All `.gs` files share a \
single global scope — functions defined in one file are callable from any other file.
- Use `Logger.log()` for logging, never `console.log()`.
- Server-side GAS runs on Google's V8 engine with a 6-minute hard execution limit and daily \
quota limits (UrlFetch, email, spreadsheet writes, etc.).
- HTML files (`.html`) are served via `HtmlService`. Client-to-server calls use \
`google.script.run.withSuccessHandler(...).myFunction()` — never fetch the backend directly.
- Preserve all existing triggers (`onOpen`, `onEdit`, `doGet`, `doPost`, time-based). \
Do not rename or remove trigger functions even if they appear unused.
- Preserve `@OnlyCurrentDoc` and other JSDoc annotations that control OAuth scopes.
- Spreadsheet operations: prefer batch reads/writes (`getValues`/`setValues`) over cell-by-cell \
operations to avoid quota exhaustion.

## How to reason before acting
1. Read ALL files to understand the project architecture.
2. Identify which files are affected by the requested change.
3. If a function, variable, or constant is referenced across multiple files, update all \
occurrences consistently.
4. If the request is ambiguous, apply the most conservative interpretation that satisfies \
the intent without breaking anything else.

## Output rules — non-negotiable
- Return ONLY a raw JSON object. Zero markdown, zero ```json fences, zero explanation, \
zero text before or after the JSON.
- JSON structure:
  {{"files": [{{"filename": "...", "content": "...", "file_type": "..."}}], "version_message": "..."}}
- Include ALL files (modified AND unmodified) in the `files` array.
- `file_type` MUST be lowercase: `server_js` (for .gs/.js files), `html` (for .html files), \
`json` (for .json files). NEVER use uppercase variants like SERVER_JS, HTML, JSON.
- `content`: include the FULL file content verbatim. NEVER truncate with comments like \
"// ... unchanged ..." or "// rest of file". If the file is not modified, copy it exactly as-is.
- `version_message`: one short French sentence describing exactly what changed.
- Preserve the original code style, indentation, and existing comments.

## Few-shot example
User request: "Ajoute une fonction utilitaire formatDate qui formate une date en dd/mm/yyyy"
Expected response (illustrative, not literal):
{{"files":[{{"filename":"utils.gs","content":"function formatDate(date) {{\\n  var d = new Date(date);\\n  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');\\n}}\\n","file_type":"server_js"}},{{"filename":"Code.gs","content":"function onOpen() {{\\n  // full original content here\\n}}\\n","file_type":"server_js"}}],"version_message":"Ajout de la fonction utilitaire formatDate"}}"""

    sheets_section = (
        f"\n\nGoogle Sheets context (structure du spreadsheet lié):\n{sheets_context}"
        if sheets_context
        else ""
    )

    user_message = (
        f"Project files:\n\n{files_context}"
        f"{sheets_section}\n\n"
        f"User request: {prompt}\n\n"
        "Analyse the full codebase, then return the JSON with all files."
    )

    messages: list[LLMMessage] = [LLMMessage(role="system", content=system_prompt)]
    for h in history or []:
        messages.append(LLMMessage(role=h.role, content=h.content))
    messages.append(LLMMessage(role="user", content=user_message))

    provider = get_provider(name="vertex", model="gemini-2.5-flash", api_key="")
    raw = await provider.complete(messages)

    json_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not json_match:
        raise ValueError(f"LLM did not return valid JSON. Response: {raw[:200]}")

    json_str = json_match.group()
    # Fix invalid JSON escape sequences produced by LLM (e.g. \s \d \w in JS regex)
    json_str = re.sub(r'\\([^"\\/bfnrtu0-9])', r"\\\\\1", json_str)
    result = json.loads(json_str)
    for f in result.get("files", []):
        if "file_type" in f:
            f["file_type"] = f["file_type"].lower()
    return result
