from __future__ import annotations

from pydantic import BaseModel


class GoogleAuthRequest(BaseModel):
    id_token: str


class UserOut(BaseModel):
    email: str
    name: str
    picture: str | None

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105
    user: UserOut
