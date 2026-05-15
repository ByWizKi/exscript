from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    google_client_id: str
    allowed_domain: str = "extia-inge.fr"
    encryption_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()  # type: ignore[call-arg]
