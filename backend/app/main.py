from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.session import engine, Base
from app.modules.auth.router import router as auth_router
from app.modules.scripts.router import router as scripts_router
from app.modules.google.router import router as google_router
import app.db.models.script as _script_models  # noqa: F401
import app.db.models.user as _user_models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="ExScript API", lifespan=lifespan)

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


@app.get("/health")
async def health():
    return {"status": "ok"}
