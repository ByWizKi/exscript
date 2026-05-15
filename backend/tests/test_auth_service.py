from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.modules.auth.service import authenticate_google


@pytest.mark.asyncio
async def test_authenticate_google_with_invalid_token(db):
    # Test with an invalid token
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_google("invalid_token", db)
    # Should get 401 Unauthorized
    assert exc_info.value.status_code == 401
