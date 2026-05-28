from __future__ import annotations

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token

from .crud import get_or_create_user


async def authenticate_google(token: str, db: AsyncSession) -> dict:
    try:
        info = id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.google_client_id
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Google invalide"
        ) from err

    email: str = info.get("email", "")
    domain = email.split("@")[-1] if "@" in email else ""

    if domain != settings.allowed_domain:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Accès réservé aux emails @{settings.allowed_domain}",
        )

    user = await get_or_create_user(
        db,
        email=email,
        name=info.get("name", ""),
        picture=info.get("picture"),
    )

    access_token = create_access_token({"sub": user.email, "name": user.name})
    return {"access_token": access_token, "user": user}
