from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.security import decode_access_token

bearer = HTTPBearer(auto_error=False)


def get_current_email(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),  # noqa: B008
) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as err:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré") from err
    return payload["sub"]
