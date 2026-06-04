from __future__ import annotations

import re

# Trigger functions that must be preserved across modifications
GAS_TRIGGERS = frozenset(["onOpen", "onEdit", "onInstall", "onSelectionChange", "doGet", "doPost"])

# Patterns that are forbidden in GAS server-side code
_FORBIDDEN: list[tuple[str, str]] = [
    (r"\bconsole\.log\b", "Utilise Logger.log() au lieu de console.log()"),
    (
        r"^\s*(import|export)\s+",
        "Les modules ES ne sont pas supportés par GAS (pas d'import/export)",
    ),
    (r"\brequire\s*\(", "require() n'est pas supporté par GAS"),
    (r"\bfetch\s*\(", "Utilise UrlFetchApp.fetch() au lieu de fetch()"),
]


def _extract_defined_triggers(content: str) -> set[str]:
    """Return the set of trigger function names defined in a JS source string."""
    defined = set()
    for trigger in GAS_TRIGGERS:
        if re.search(rf"\bfunction\s+{re.escape(trigger)}\s*\(", content):
            defined.add(trigger)
    return defined


def validate_gas_files(
    original_files: list[dict],
    modified_files: list[dict],
) -> list[str]:
    """
    Validate modified GAS files against Google Apps Script constraints.
    Returns a list of violation messages (empty = valid).
    """
    violations: list[str] = []

    # Collect triggers defined in original codebase
    original_triggers: set[str] = set()
    for f in original_files:
        if f.get("file_type") in ("server_js", "SERVER_JS"):
            original_triggers |= _extract_defined_triggers(f.get("content", ""))

    # Collect triggers in modified codebase
    modified_triggers: set[str] = set()
    for f in modified_files:
        if f.get("file_type") in ("server_js", "SERVER_JS"):
            content = f.get("content", "")
            modified_triggers |= _extract_defined_triggers(content)

            # Check forbidden patterns line by line
            for lineno, line in enumerate(content.splitlines(), 1):
                for pattern, message in _FORBIDDEN:
                    if re.search(pattern, line):
                        violations.append(f"{f['filename']}:{lineno} — {message}")

    # Triggers that existed before must still exist
    missing = original_triggers - modified_triggers
    for trigger in sorted(missing):
        violations.append(
            f"Trigger '{trigger}' supprimé — il doit être conservé dans la version modifiée"
        )

    return violations
