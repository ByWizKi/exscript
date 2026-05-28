from __future__ import annotations

import pytest

from app.modules.scripts.ai import _fetch_sheets_context


@pytest.mark.asyncio
async def test_fetch_sheets_context_with_invalid_credentials():
    # Test when the API call fails with invalid credentials
    result = await _fetch_sheets_context("invalid_id", "invalid_token")
    # Should return empty string on failure
    assert isinstance(result, str)
    # Empty id and token should result in empty string
    assert result == ""
