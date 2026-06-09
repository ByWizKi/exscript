from __future__ import annotations

import json
import re

from sqlalchemy.ext.asyncio import AsyncSession

from .analyzer import analyze_gas_files
from .crud import get_script, save_chat_message
from .validator import validate_gas_files


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
            while row_vals and row_vals[-1] == "":
                row_vals.pop()
            if any(row_vals):
                table_rows.append(row_vals)

        if not table_rows:
            continue

        max_cols = max(len(r) for r in table_rows)
        headers = table_rows[0] + [""] * (max_cols - len(table_rows[0]))
        lines.append("Colonnes : " + " | ".join(headers))
        lines.append(f"Nombre de lignes de données : {len(table_rows) - 1}")

        for row in table_rows[1:4]:
            row += [""] * (max_cols - len(row))
            lines.append("  " + " | ".join(row))
        if len(table_rows) > 4:
            lines.append(f"  ... ({len(table_rows) - 4} lignes supplémentaires)")

    return "\n".join(lines)


def _parse_llm_json(raw: str) -> dict:
    start = raw.find("{")
    if start == -1:
        raise ValueError(f"LLM did not return valid JSON. Response: {raw[:200]}")
    json_str = re.sub(r'\\([^"\\/bfnrtu0-9])', r"\\\\\1", raw[start:])
    try:
        result, _ = json.JSONDecoder().raw_decode(json_str)
    except json.JSONDecodeError as exc:
        raise ValueError(f"LLM JSON parse error: {exc}. Response: {raw[:200]}") from exc
    return result


async def ai_clarify_script(
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

    latest = script.versions[-1] if script.versions else None
    if not latest or not latest.files:
        raise ValueError("No files found in the latest version")

    files_as_dicts = [
        {"filename": f.filename, "content": f.content, "file_type": f.file_type}
        for f in latest.files
    ]
    file_list = ", ".join(f.filename for f in latest.files)
    files_context = "\n\n".join(
        f"### {f.filename}\n```javascript\n{f.content}\n```" for f in latest.files
    )
    semantic_context = analyze_gas_files(files_as_dicts)
    project_name = script.name

    sheets_context = ""
    if google_access_token and script.spreadsheet_id:
        sheets_context = await _fetch_sheets_context(script.spreadsheet_id, google_access_token)

    sheets_section = (
        f"\n\nGoogle Sheets lié (structure) :\n{sheets_context}" if sheets_context else ""
    )

    system_prompt = f"""Tu es un expert Google Apps Script (GAS) qui aide des personnes non-techniques.
Ton rôle ici est uniquement de COMPRENDRE et REFORMULER la demande de l'utilisateur, pas de générer du code.

Projet : {project_name}
Fichiers disponibles : {file_list}

{semantic_context}

Contenu actuel des fichiers :
{files_context}{sheets_section}

Analyse la demande et réponds en JSON strictement de cette forme (sans markdown, sans texte autour) :
{{"type": "modification", "feasible": true, "reformulation": "...", "explanation": "", "files_affected": [], "plan": []}}

RÈGLE PRIMORDIALE sur "type" — détermine-le EN PREMIER avant tout :
- "explanation" : dès que l'utilisateur pose une question ou demande de comprendre quelque chose. Mots-clés : "explique", "c'est quoi", "comment fonctionne", "que fait", "décris", "qu'est-ce que", "pourquoi", "comment", "dis-moi". TYPE EXPLANATION même si la demande contient aussi des mots comme "projet", "script", "code".
- "modification" : UNIQUEMENT si l'utilisateur demande explicitement un changement dans le code : "ajoute", "modifie", "supprime", "corrige", "améliore", "refactorise", "crée une fonction".

Règles sur "feasible" (uniquement pour type=modification) :
- false si la demande est hors scope, destructrice, ou impossible en Google Apps Script. Mets alors "reformulation" = explication courte du refus, "files_affected" = [], "plan" = [].

Règles générales :
- "reformulation" : pour une modification, explique ce que tu vas faire en français simple, commence par "Je vais...". Pour une explication, laisse vide "".
- "explanation" : pour une question/explication, ta réponse complète en français simple (plusieurs phrases ok). Pour une modification, laisse vide "".
- "files_affected" : uniquement les fichiers réellement modifiés parmi [{file_list}], basé sur le contenu réel des fichiers ci-dessus
- "plan" : 2 à 4 actions concrètes sans jargon, basées sur ce qui existe dans le code. Vide si type=explanation.
- Ne jamais inventer des fonctions ou fichiers qui n'existent pas dans le code fourni"""

    messages: list[LLMMessage] = [LLMMessage(role="system", content=system_prompt)]
    for h in history or []:
        messages.append(LLMMessage(role=h.role, content=h.content))
    messages.append(LLMMessage(role="user", content=f"Demande de l'utilisateur : {prompt}"))

    provider = get_provider(name="vertex", model="gemini-2.5-pro", api_key="")
    raw = await provider.complete(messages)
    result = _parse_llm_json(raw)

    clarification = {
        "type": result.get("type", "modification"),
        "feasible": result.get("feasible", True),
        "reformulation": result.get("reformulation", ""),
        "explanation": result.get("explanation", ""),
        "files_affected": result.get("files_affected", []),
        "plan": result.get("plan", []),
    }

    await save_chat_message(
        script_id=script_id,
        role="user",
        content=prompt,
        message_type="user",
        db=db,
    )
    await save_chat_message(
        script_id=script_id,
        role="assistant",
        content="",
        message_type="clarification",
        db=db,
        metadata_json=clarification,
    )

    return clarification


async def ai_modify_script(
    script_id: int,
    prompt: str,
    db: AsyncSession,
    google_access_token: str | None = None,
    history: list | None = None,
    base_files: list | None = None,
) -> dict:
    from app.llm.base import LLMMessage
    from app.llm.factory import get_provider

    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    if base_files:
        working_files = base_files
    else:
        latest = script.versions[-1] if script.versions else None
        if not latest or not latest.files:
            raise ValueError("No files found in the latest version")
        working_files = [
            {"filename": f.filename, "content": f.content, "file_type": f.file_type}
            for f in latest.files
        ]

    original_files = [dict(f) for f in working_files]
    semantic_context = analyze_gas_files(working_files)

    files_context = "\n\n".join(
        f"### {f['filename']}\n```javascript\n{f['content']}\n```" for f in working_files
    )

    sheets_context = ""
    if google_access_token and script.spreadsheet_id:
        sheets_context = await _fetch_sheets_context(script.spreadsheet_id, google_access_token)

    file_count = len(working_files)
    file_list = ", ".join(f["filename"] for f in working_files)
    project_name = script.name

    system_prompt = f"""You are an expert Google Apps Script (GAS) developer embedded inside ExScript, \
a versioning and AI-editing tool for GAS projects. You function like an IDE-integrated AI assistant \
(think GitHub Copilot or Claude Code) — you have full access to every file in the project and you \
reason about the whole codebase before making any change.

## Your project context
- Project name: {project_name}
- Files ({file_count}): {file_list}

{semantic_context}

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
- Include ONLY the files you actually modify. Unchanged files must be omitted entirely.
- `file_type` MUST be lowercase: `server_js` (for .gs/.js files), `html` (for .html files), \
`json` (for .json files). NEVER use uppercase variants like SERVER_JS, HTML, JSON.
- `content`: include the FULL content of the modified file. NEVER truncate with comments like \
"// ... unchanged ..." or "// rest of file".
- `version_message`: one short French sentence describing exactly what changed.
- Preserve the original code style, indentation, and existing comments.

## Few-shot example
User request: "Ajoute une fonction utilitaire formatDate qui formate une date en dd/mm/yyyy"
Expected response (illustrative, not literal — only utils.gs is modified, Code.gs is omitted):
{{"files":[{{"filename":"utils.gs","content":"function formatDate(date) {{\\n  var d = new Date(date);\\n  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');\\n}}\\n","file_type":"server_js"}}],"version_message":"Ajout de la fonction utilitaire formatDate"}}"""

    sheets_section = (
        f"\n\nGoogle Sheets context (structure du spreadsheet lié):\n{sheets_context}"
        if sheets_context
        else ""
    )

    base_user_message = (
        f"Project files:\n\n{files_context}"
        f"{sheets_section}\n\n"
        f"User request: {prompt}\n\n"
        "Analyse the full codebase, then return the JSON with ONLY the modified files."
    )

    def _infer_file_type(filename: str) -> str:
        if filename.endswith(".html"):
            return "html"
        if filename.endswith(".json"):
            return "json"
        return "server_js"

    def _merge_result(result: dict, source_files: list[dict]) -> list[dict]:
        modified = {f["filename"]: f for f in result.get("files", [])}
        for f in modified.values():
            if "file_type" in f:
                f["file_type"] = f["file_type"].lower()
            else:
                f["file_type"] = _infer_file_type(f["filename"])
        merged = []
        for original in source_files:
            fname = original["filename"]
            if fname in modified:
                merged.append(modified[fname])
            else:
                merged.append(dict(original))
        return merged

    steps = []
    provider = get_provider(name="vertex", model="gemini-2.5-pro", api_key="")

    # Agentic loop: generate → validate → self-correct (max 3 attempts)
    current_user_message = base_user_message
    current_working_files = working_files
    last_result: dict = {}
    validation_warnings: list[str] = []

    for attempt in range(1, 4):
        steps.append({"type": "generating", "message": f"Génération {attempt}/3 en cours..."})

        messages: list[LLMMessage] = [LLMMessage(role="system", content=system_prompt)]
        for h in history or []:
            messages.append(LLMMessage(role=h.role, content=h.content))
        messages.append(LLMMessage(role="user", content=current_user_message))

        raw = await provider.complete(messages)
        last_result = _parse_llm_json(raw)
        merged = _merge_result(last_result, current_working_files)

        steps.append({"type": "validating", "message": "Validation GAS en cours..."})
        violations = validate_gas_files(original_files, merged)

        if not violations:
            steps.append({"type": "done", "message": "Code validé sans erreur."})
            last_result["files"] = merged
            break

        if attempt < 3:
            steps.append(
                {
                    "type": "fixing",
                    "message": f"Erreurs détectées ({len(violations)}), correction automatique...",
                }
            )
            violations_text = "\n".join(f"- {v}" for v in violations)
            current_user_message = (
                f"{base_user_message}\n\n"
                f"IMPORTANT: Your previous response had the following GAS validation errors:\n"
                f"{violations_text}\n\n"
                "Fix ALL of these issues and return the corrected JSON."
            )
        else:
            # Last attempt failed — warn but keep the result
            steps.append(
                {
                    "type": "warning",
                    "message": f"{len(violations)} avertissement(s) GAS restant(s) après correction.",
                }
            )
            validation_warnings = violations
            last_result["files"] = merged

    if not last_result.get("version_message"):
        last_result["version_message"] = "Modification du script"

    result_payload = {
        "files": last_result["files"],
        "version_message": last_result["version_message"],
        "steps": steps,
        "validation_warnings": validation_warnings,
    }

    await save_chat_message(
        script_id=script_id,
        role="assistant",
        content="",
        message_type="result",
        db=db,
        metadata_json=result_payload,
    )

    return result_payload


async def ai_document_script(
    script_id: int,
    db: AsyncSession,
    base_files: list | None = None,
) -> dict:
    """Generate JSDoc documentation for all undocumented functions."""
    from app.llm.base import LLMMessage
    from app.llm.factory import get_provider

    script = await get_script(script_id, db)
    if not script:
        raise ValueError("Script not found")

    if base_files:
        working_files = base_files
    else:
        latest = script.versions[-1] if script.versions else None
        if not latest or not latest.files:
            raise ValueError("No files found in the latest version")
        working_files = [
            {"filename": f.filename, "content": f.content, "file_type": f.file_type}
            for f in latest.files
        ]

    server_files = [f for f in working_files if f.get("file_type") in ("server_js", "SERVER_JS")]
    if not server_files:
        return {
            "files": working_files,
            "version_message": "Aucun fichier JS à documenter",
            "steps": [{"type": "done", "message": "Aucun fichier JS trouvé."}],
            "validation_warnings": [],
        }

    files_context = "\n\n".join(
        f"### {f['filename']}\n```javascript\n{f['content']}\n```" for f in server_files
    )
    file_list = ", ".join(f["filename"] for f in server_files)

    system_prompt = f"""You are an expert Google Apps Script (GAS) developer. \
Your task is to add JSDoc documentation to all functions that are missing it.

Rules:
- Add `/** ... */` JSDoc comments above every undocumented function.
- Include @param and @return tags with types and descriptions.
- Keep existing comments and code unchanged — only ADD missing JSDoc blocks.
- Return ONLY a raw JSON object with the documented files.
- JSON structure: {{"files": [{{"filename": "...", "content": "...", "file_type": "server_js"}}], "version_message": "..."}}
- Include ONLY files you actually modified.
- `version_message`: one short French sentence.

Files to document: {file_list}"""

    messages: list[LLMMessage] = [
        LLMMessage(role="system", content=system_prompt),
        LLMMessage(
            role="user",
            content=f"Add JSDoc to all undocumented functions:\n\n{files_context}",
        ),
    ]

    provider = get_provider(name="vertex", model="gemini-2.5-pro", api_key="")
    raw = await provider.complete(messages)
    result = _parse_llm_json(raw)

    modified = {f["filename"]: f for f in result.get("files", [])}
    merged = []
    for f in working_files:
        fname = f["filename"]
        if fname in modified:
            doc_file = modified[fname]
            doc_file["file_type"] = doc_file.get("file_type", "server_js").lower()
            merged.append(doc_file)
        else:
            merged.append(dict(f))

    doc_result = {
        "files": merged,
        "version_message": result.get("version_message", "Documentation JSDoc générée"),
        "steps": [{"type": "done", "message": "Documentation JSDoc générée avec succès."}],
        "validation_warnings": [],
    }

    await save_chat_message(
        script_id=script_id,
        role="assistant",
        content="",
        message_type="result",
        db=db,
        metadata_json=doc_result,
    )

    return doc_result


async def _complete_accumulate(provider, messages: list) -> str:
    """Accumule les chunks de complete_stream() en une seule chaîne."""
    parts: list[str] = []
    async for chunk in provider.complete_stream(messages):
        parts.append(chunk)
    return "".join(parts)


async def ai_modify_script_stream(
    script_id: int,
    prompt: str,
    db: AsyncSession,
    google_access_token: str | None = None,
    history: list | None = None,
    base_files: list | None = None,
):
    """Générateur async qui yield des events SSE pendant la modification IA."""
    from app.llm.base import LLMMessage
    from app.llm.factory import get_provider

    try:
        script = await get_script(script_id, db)
        if not script:
            yield {"event": "error", "data": {"detail": "Script not found"}}
            return

        if base_files:
            working_files = base_files
        else:
            latest = script.versions[-1] if script.versions else None
            if not latest or not latest.files:
                yield {"event": "error", "data": {"detail": "No files found in the latest version"}}
                return
            working_files = [
                {"filename": f.filename, "content": f.content, "file_type": f.file_type}
                for f in latest.files
            ]

        original_files = [dict(f) for f in working_files]
        semantic_context = analyze_gas_files(working_files)
        files_context = "\n\n".join(
            f"### {f['filename']}\n```javascript\n{f['content']}\n```" for f in working_files
        )
        sheets_context = ""
        if google_access_token and script.spreadsheet_id:
            sheets_context = await _fetch_sheets_context(script.spreadsheet_id, google_access_token)

        file_count = len(working_files)
        file_list = ", ".join(f["filename"] for f in working_files)
        project_name = script.name

        system_prompt = f"""You are an expert Google Apps Script (GAS) developer embedded inside ExScript, \
a versioning and AI-editing tool for GAS projects. You function like an IDE-integrated AI assistant \
(think GitHub Copilot or Claude Code) — you have full access to every file in the project and you \
reason about the whole codebase before making any change.

## Your project context
- Project name: {project_name}
- Files ({file_count}): {file_list}

{semantic_context}

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
- Include ONLY the files you actually modify. Unchanged files must be omitted entirely.
- `file_type` MUST be lowercase: `server_js` (for .gs/.js files), `html` (for .html files), \
`json` (for .json files). NEVER use uppercase variants like SERVER_JS, HTML, JSON.
- `content`: include the FULL content of the modified file. NEVER truncate with comments like \
"// ... unchanged ..." or "// rest of file".
- `version_message`: one short French sentence describing exactly what changed.
- Preserve the original code style, indentation, and existing comments.

## Few-shot example
User request: "Ajoute une fonction utilitaire formatDate qui formate une date en dd/mm/yyyy"
Expected response (illustrative, not literal — only utils.gs is modified, Code.gs is omitted):
{{"files":[{{"filename":"utils.gs","content":"function formatDate(date) {{\\n  var d = new Date(date);\\n  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy');\\n}}\\n","file_type":"server_js"}}],"version_message":"Ajout de la fonction utilitaire formatDate"}}"""

        sheets_section = (
            f"\n\nGoogle Sheets context (structure du spreadsheet lié):\n{sheets_context}"
            if sheets_context
            else ""
        )
        base_user_message = (
            f"Project files:\n\n{files_context}"
            f"{sheets_section}\n\n"
            f"User request: {prompt}\n\n"
            "Analyse the full codebase, then return the JSON with ONLY the modified files."
        )

        def _infer_file_type(filename: str) -> str:
            if filename.endswith(".html"):
                return "html"
            if filename.endswith(".json"):
                return "json"
            return "server_js"

        def _merge_result(result: dict, source_files: list[dict]) -> list[dict]:
            modified = {f["filename"]: f for f in result.get("files", [])}
            for f in modified.values():
                if "file_type" in f:
                    f["file_type"] = f["file_type"].lower()
                else:
                    f["file_type"] = _infer_file_type(f["filename"])
            merged = []
            for original in source_files:
                fname = original["filename"]
                merged.append(modified[fname] if fname in modified else dict(original))
            return merged

        provider = get_provider(name="vertex", model="gemini-2.5-pro", api_key="")
        steps = []
        current_user_message = base_user_message
        current_working_files = working_files
        last_result: dict = {}
        validation_warnings: list[str] = []

        for attempt in range(1, 4):
            step_gen = {"type": "generating", "message": f"Génération {attempt}/3 en cours..."}
            steps.append(step_gen)
            yield {"event": "step", "data": step_gen}

            messages: list[LLMMessage] = [LLMMessage(role="system", content=system_prompt)]
            for h in history or []:
                messages.append(LLMMessage(role=h.role, content=h.content))
            messages.append(LLMMessage(role="user", content=current_user_message))

            raw = await _complete_accumulate(provider, messages)
            last_result = _parse_llm_json(raw)
            merged = _merge_result(last_result, current_working_files)

            step_val = {"type": "validating", "message": "Validation GAS en cours..."}
            steps.append(step_val)
            yield {"event": "step", "data": step_val}

            violations = validate_gas_files(original_files, merged)

            if not violations:
                step_done = {"type": "done", "message": "Code validé sans erreur."}
                steps.append(step_done)
                yield {"event": "step", "data": step_done}
                last_result["files"] = merged
                break

            if attempt < 3:
                step_fix = {
                    "type": "fixing",
                    "message": f"Erreurs détectées ({len(violations)}), correction automatique...",
                }
                steps.append(step_fix)
                yield {"event": "step", "data": step_fix}
                violations_text = "\n".join(f"- {v}" for v in violations)
                current_user_message = (
                    f"{base_user_message}\n\n"
                    f"IMPORTANT: Your previous response had the following GAS validation errors:\n"
                    f"{violations_text}\n\n"
                    "Fix ALL of these issues and return the corrected JSON."
                )
            else:
                step_warn = {
                    "type": "warning",
                    "message": f"{len(violations)} avertissement(s) GAS restant(s) après correction.",
                }
                steps.append(step_warn)
                yield {"event": "step", "data": step_warn}
                validation_warnings = violations
                last_result["files"] = merged

        if not last_result.get("version_message"):
            last_result["version_message"] = "Modification du script"

        result_payload = {
            "files": last_result["files"],
            "version_message": last_result["version_message"],
            "steps": steps,
            "validation_warnings": validation_warnings,
        }

        await save_chat_message(
            script_id=script_id,
            role="assistant",
            content="",
            message_type="result",
            db=db,
            metadata_json=result_payload,
        )

        yield {"event": "result", "data": result_payload}
        yield {"event": "done", "data": {}}

    except Exception as err:
        yield {"event": "error", "data": {"detail": str(err)}}


async def ai_document_script_stream(
    script_id: int,
    db: AsyncSession,
    base_files: list | None = None,
):
    """Générateur async qui yield des events SSE pendant la documentation IA."""
    from app.llm.base import LLMMessage
    from app.llm.factory import get_provider

    try:
        script = await get_script(script_id, db)
        if not script:
            yield {"event": "error", "data": {"detail": "Script not found"}}
            return

        if base_files:
            working_files = base_files
        else:
            latest = script.versions[-1] if script.versions else None
            if not latest or not latest.files:
                yield {"event": "error", "data": {"detail": "No files found in the latest version"}}
                return
            working_files = [
                {"filename": f.filename, "content": f.content, "file_type": f.file_type}
                for f in latest.files
            ]

        server_files = [
            f for f in working_files if f.get("file_type") in ("server_js", "SERVER_JS")
        ]
        if not server_files:
            result_payload = {
                "files": working_files,
                "version_message": "Aucun fichier JS à documenter",
                "steps": [{"type": "done", "message": "Aucun fichier JS trouvé."}],
                "validation_warnings": [],
            }
            yield {"event": "result", "data": result_payload}
            yield {"event": "done", "data": {}}
            return

        step_gen = {"type": "generating", "message": "Génération de la documentation JSDoc..."}
        yield {"event": "step", "data": step_gen}

        files_context = "\n\n".join(
            f"### {f['filename']}\n```javascript\n{f['content']}\n```" for f in server_files
        )
        file_list = ", ".join(f["filename"] for f in server_files)

        system_prompt = f"""You are an expert Google Apps Script (GAS) developer. \
Your task is to add JSDoc documentation to all functions that are missing it.

Rules:
- Add `/** ... */` JSDoc comments above every undocumented function.
- Include @param and @return tags with types and descriptions.
- Keep existing comments and code unchanged — only ADD missing JSDoc blocks.
- Return ONLY a raw JSON object with the documented files.
- JSON structure: {{"files": [{{"filename": "...", "content": "...", "file_type": "server_js"}}], "version_message": "..."}}
- Include ONLY files you actually modified.
- `version_message`: one short French sentence.

Files to document: {file_list}"""

        messages: list[LLMMessage] = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(
                role="user",
                content=f"Add JSDoc to all undocumented functions:\n\n{files_context}",
            ),
        ]

        provider = get_provider(name="vertex", model="gemini-2.5-pro", api_key="")
        raw = await _complete_accumulate(provider, messages)
        result = _parse_llm_json(raw)

        modified = {f["filename"]: f for f in result.get("files", [])}
        merged = []
        for f in working_files:
            fname = f["filename"]
            if fname in modified:
                doc_file = modified[fname]
                doc_file["file_type"] = doc_file.get("file_type", "server_js").lower()
                merged.append(doc_file)
            else:
                merged.append(dict(f))

        doc_result = {
            "files": merged,
            "version_message": result.get("version_message", "Documentation JSDoc générée"),
            "steps": [{"type": "done", "message": "Documentation JSDoc générée avec succès."}],
            "validation_warnings": [],
        }

        await save_chat_message(
            script_id=script_id,
            role="assistant",
            content="",
            message_type="result",
            db=db,
            metadata_json=doc_result,
        )

        yield {"event": "result", "data": doc_result}
        yield {"event": "done", "data": {}}

    except Exception as err:
        yield {"event": "error", "data": {"detail": str(err)}}
