from __future__ import annotations

import re


def analyze_gas_files(files: list[dict]) -> str:
    """
    Perform regex-based semantic analysis of GAS files.
    Returns a compact context string to inject into LLM prompts.
    """
    all_functions: list[str] = []
    triggers: list[str] = []
    global_vars: list[str] = []
    cross_calls: dict[str, list[str]] = {}  # filename -> functions called from other files

    function_names_by_file: dict[str, list[str]] = {}

    for f in files:
        if f.get("file_type") not in ("server_js", "SERVER_JS"):
            continue
        content = f.get("content", "")
        filename = f.get("filename", "?")

        # Extract function declarations
        fns = re.findall(r"\bfunction\s+(\w+)\s*\(", content)
        function_names_by_file[filename] = fns
        all_functions.extend(f"{filename}::{fn}" for fn in fns)

        # Identify triggers
        trigger_names = {"onOpen", "onEdit", "onInstall", "onSelectionChange", "doGet", "doPost"}
        for fn in fns:
            if fn in trigger_names:
                triggers.append(fn)

        # Extract global var/const/let declarations (top-level = not indented)
        gvars = re.findall(r"^(?:var|const|let)\s+(\w+)", content, re.MULTILINE)
        global_vars.extend(f"{filename}::{v}" for v in gvars)

    # Detect cross-file calls: functions from one file called in another
    all_fn_names = {fn.split("::")[-1] for fn in all_functions}
    for f in files:
        if f.get("file_type") not in ("server_js", "SERVER_JS"):
            continue
        content = f.get("content", "")
        filename = f.get("filename", "?")
        local_fns = set(function_names_by_file.get(filename, []))
        called = re.findall(r"\b(\w+)\s*\(", content)
        external_calls = [c for c in called if c in all_fn_names and c not in local_fns]
        if external_calls:
            cross_calls[filename] = list(
                dict.fromkeys(external_calls)
            )  # deduplicate, preserve order

    lines = ["## Semantic Analysis"]
    lines.append(
        f"Functions ({len(all_functions)}): " + ", ".join(all_functions)
        if all_functions
        else "Functions: none"
    )
    if triggers:
        lines.append("Triggers: " + ", ".join(triggers))
    if global_vars:
        lines.append("Global vars: " + ", ".join(global_vars))
    if cross_calls:
        for fname, calls in cross_calls.items():
            lines.append(f"Cross-file calls in {fname}: " + ", ".join(calls))

    return "\n".join(lines)
