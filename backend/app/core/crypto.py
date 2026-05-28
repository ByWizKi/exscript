from __future__ import annotations

_fernet = None


def _get_fernet():
    global _fernet
    if _fernet is not None:
        return _fernet
    from app.core.config import settings

    key = settings.encryption_key
    if not key:
        return None
    from cryptography.fernet import Fernet

    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt(value: str) -> str:
    f = _get_fernet()
    if f is None:
        return value
    return f.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    f = _get_fernet()
    if f is None:
        return value
    try:
        return f.decrypt(value.encode()).decode()
    except Exception:
        return value  # already plain text (migration case)
