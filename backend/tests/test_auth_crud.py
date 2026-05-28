from __future__ import annotations

import pytest

from app.modules.auth.crud import get_or_create_user


@pytest.mark.asyncio
async def test_create_new_user(db):
    user = await get_or_create_user(db, "new@example.com", "New User", "http://pic.url")
    assert user.id is not None
    assert user.email == "new@example.com"
    assert user.name == "New User"
    assert user.picture == "http://pic.url"


@pytest.mark.asyncio
async def test_create_user_without_picture(db):
    user = await get_or_create_user(db, "nopic@example.com", "No Pic", None)
    assert user.picture is None


@pytest.mark.asyncio
async def test_update_existing_user(db):
    await get_or_create_user(db, "existing@example.com", "Old Name", None)
    user = await get_or_create_user(db, "existing@example.com", "New Name", "http://new.pic")
    assert user.name == "New Name"
    assert user.picture == "http://new.pic"
    assert user.last_login is not None


@pytest.mark.asyncio
async def test_get_or_create_idempotent(db):
    u1 = await get_or_create_user(db, "idempotent@example.com", "User", None)
    u2 = await get_or_create_user(db, "idempotent@example.com", "User", None)
    assert u1.id == u2.id
