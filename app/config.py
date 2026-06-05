import os
from functools import lru_cache

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass


class Settings:
    def __init__(self) -> None:
        self.secret_key: str = os.getenv(
            "SECRET_KEY", "dev-secret-change-in-production"
        )
        self.algorithm: str = os.getenv("ALGORITHM", "HS256")
        self.access_token_expire_minutes: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7))
        )
        self.database_url: str = os.getenv(
            "DATABASE_URL", "sqlite:///./app/database.db"
        )
        self.db_pool_size: int = int(os.getenv("DB_POOL_SIZE", "10"))
        self.db_max_overflow: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
        self.cors_origins: str = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,"
            "http://localhost:5174,http://127.0.0.1:5174,"
            "https://cleaning-frontend.onrender.com",
        )
        self.admin_usernames: str = os.getenv("ADMIN_USERNAMES", "")
        self.uploads_dir: str = os.getenv("UPLOADS_DIR", "uploads")
        self.max_avatar_bytes: int = int(os.getenv("MAX_AVATAR_BYTES", str(2 * 1024 * 1024)))
        self.max_cleanings_per_week: int = int(os.getenv("MAX_CLEANINGS_PER_WEEK", "2"))
        self.expose_reset_token: bool = os.getenv("EXPOSE_RESET_TOKEN", "false").lower() in (
            "1",
            "true",
            "yes",
        )
        self.reset_code_expire_minutes: int = int(
            os.getenv("RESET_CODE_EXPIRE_MINUTES", "30")
        )
        self.smtp_host: str = os.getenv("SMTP_HOST", "")
        self.smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user: str = os.getenv("SMTP_USER", "")
        self.smtp_password: str = os.getenv("SMTP_PASSWORD", "")
        self.smtp_from: str = os.getenv("SMTP_FROM", "")
        self.smtp_use_tls: bool = os.getenv("SMTP_USE_TLS", "true").lower() in (
            "1",
            "true",
            "yes",
        )
        self.smtp_use_ssl: bool = os.getenv("SMTP_USE_SSL", "false").lower() in (
            "1",
            "true",
            "yes",
        )
        self.public_app_url: str = os.getenv(
            "PUBLIC_APP_URL", "http://localhost:5173"
        )

    @property
    def smtp_configured(self) -> bool:
        return bool(self.smtp_host and self.smtp_from)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_username_set(self) -> set[str]:
        return {u.strip().lower() for u in self.admin_usernames.split(",") if u.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
