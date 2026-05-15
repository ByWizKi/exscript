import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.db.models.script as _script_models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import app.db.models.setting as _setting_models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import app.db.models.user as _user_models  # noqa: F401  # pyright: ignore[reportUnusedImport]
from app.db.session import Base, engine
from app.modules.auth.router import router as auth_router
from app.modules.google.router import router as google_router
from app.modules.scripts.router import router as scripts_router
from app.modules.settings.router import router as settings_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


# Enable OpenAPI docs in development, disable in production
environment = os.getenv("ENVIRONMENT", "development")
docs_url = "/docs" if environment != "production" else None
redoc_url = "/redoc" if environment != "production" else None

app = FastAPI(
    title="ExScript API",
    lifespan=lifespan,
    docs_url=docs_url,
    redoc_url=redoc_url,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3011"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(scripts_router, prefix="/scripts")
app.include_router(google_router, prefix="/google")
app.include_router(settings_router, prefix="/settings")


@app.get("/health")
async def health():
    return {"status": "ok"}
