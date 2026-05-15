from __future__ import annotations

import pytest

from app.core.crypto import encrypt, decrypt


def test_encrypt_decrypt_roundtrip():
    original = "sk-test-key-12345"
    assert decrypt(encrypt(original)) == original


def test_decrypt_plain_text_returns_as_is():
    # Backward compat: if no encryption key, value is returned as-is
    plain = "plain-text-value"
    result = decrypt(plain)
    assert result == plain


def test_encrypt_returns_different_value():
    # Only test if encryption is configured
    from app.core.config import settings

    if not settings.encryption_key:
        return  # skip if no key configured
    original = "my-secret-key"
    encrypted = encrypt(original)
    assert encrypted != original


def test_empty_string_roundtrip():
    assert decrypt(encrypt("")) == ""


def test_decrypt_invalid_data_returns_original():
    # If decrypt fails (corrupted), return the input as-is
    invalid = "not.valid.encrypted.data"
    result = decrypt(invalid)
    assert result == invalid
