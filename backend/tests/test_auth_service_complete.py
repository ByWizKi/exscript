from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.modules.auth.service import authenticate_google


@pytest.mark.asyncio
async def test_authenticate_google_invalid_token(db):
    # Test with completely invalid token
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_google("invalid_token_xyz", db)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_authenticate_google_empty_token(db):
    # Test with empty token
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_google("", db)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_authenticate_google_malformed_token(db):
    # Test with malformed JWT-like token
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_google("not.a.validtoken", db)
    assert exc_info.value.status_code == 401
