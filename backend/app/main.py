import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

import app.db.models.script as _script_models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import app.db.models.setting as _setting_models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import app.db.models.user as _user_models  # noqa: F401  # pyright: ignore[reportUnusedImport]
from app.core.logging import configure_logging, get_logger
from app.db.session import Base, engine
from app.modules.auth.router import router as auth_router
from app.modules.google.router import router as google_router
from app.modules.scripts.router import router as scripts_router
from app.modules.settings.router import router as settings_router

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging(debug=os.getenv("ENVIRONMENT") != "production")
    logger.info("api_started", environment=os.getenv("ENVIRONMENT", "development"))
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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(auth_router, prefix="/auth")
app.include_router(scripts_router, prefix="/scripts")
app.include_router(google_router, prefix="/google")
app.include_router(settings_router, prefix="/settings")


@app.get("/health")
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as e:
        logger.error("health_check_failed", error=str(e))
        return JSONResponse(status_code=503, content={"status": "error", "db": "unreachable"})
