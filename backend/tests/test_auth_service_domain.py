from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.modules.auth.service import authenticate_google


@pytest.mark.asyncio
async def test_authenticate_google_forbidden_domain(db):
    mock_info = {
        "email": "user@gmail.com",
        "name": "External User",
        "picture": None,
    }
    with patch("app.modules.auth.service.id_token.verify_oauth2_token", return_value=mock_info):
        with pytest.raises(HTTPException) as exc_info:
            await authenticate_google("valid_token", db)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_authenticate_google_allowed_domain(db):
    from app.core.config import settings

    mock_info = {
        "email": f"user@{settings.allowed_domain}",
        "name": "Internal User",
        "picture": "http://pic.url",
    }
    with patch("app.modules.auth.service.id_token.verify_oauth2_token", return_value=mock_info):
        result = await authenticate_google("valid_token", db)
    assert "access_token" in result
    assert result["user"].email == f"user@{settings.allowed_domain}"


@pytest.mark.asyncio
async def test_authenticate_google_invalid_token(db):
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_google("garbage_token", db)
    assert exc_info.value.status_code == 401
