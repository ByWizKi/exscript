from __future__ import annotations

import pytest
from jose import JWTError

from app.core.security import create_access_token, decode_access_token


def test_create_and_decode_token():
    token = create_access_token({"sub": "user@test.com"})
    payload = decode_access_token(token)
    assert payload["sub"] == "user@test.com"


def test_token_contains_expiry():
    token = create_access_token({"sub": "user@test.com"})
    payload = decode_access_token(token)
    assert "exp" in payload


def test_invalid_token_raises():
    with pytest.raises(JWTError):
        decode_access_token("invalid.token.here")


def test_tampered_token_raises():
    token = create_access_token({"sub": "user@test.com"})
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        decode_access_token(tampered)


def test_token_payload_includes_all_data():
    data = {"sub": "user@example.com", "extra": "info"}
    token = create_access_token(data)
    payload = decode_access_token(token)
    assert payload["sub"] == "user@example.com"
    assert payload["extra"] == "info"
