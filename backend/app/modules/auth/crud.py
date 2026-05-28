from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User


async def get_or_create_user(db: AsyncSession, email: str, name: str, picture: str | None) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(email=email, name=name, picture=picture)
        db.add(user)
    else:
        user.name = name
        user.picture = picture
        user.last_login = datetime.now(UTC)

    await db.commit()
    await db.refresh(user)
    return user
