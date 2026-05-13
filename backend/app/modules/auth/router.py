from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from .schemas import GoogleAuthRequest, AuthResponse, UserOut
from .service import authenticate_google

router = APIRouter()


@router.post("/google", response_model=AuthResponse)
async def google_login(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    result = await authenticate_google(body.id_token, db)
    return AuthResponse(
        access_token=result["access_token"],
        user=UserOut.model_validate(result["user"]),
    )
