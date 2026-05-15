from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    google_client_id: str
    allowed_domain: str = "extia-inge.fr"
    encryption_key: str = ""

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_must_not_be_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("JWT_SECRET must be set")
        return v

    @field_validator("database_url")
    @classmethod
    def database_url_must_not_be_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL must be set")
        return v

    @field_validator("google_client_id")
    @classmethod
    def google_client_id_must_not_be_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("GOOGLE_CLIENT_ID must be set")
        return v

    class Config:
        env_file = ".env"


settings = Settings()  # type: ignore[call-arg]
