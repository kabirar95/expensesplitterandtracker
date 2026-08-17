# ============================================================
# CONFIGURATION — All settings loaded from environment variables
# ============================================================

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    # ── App Settings ──
    app_name: str = "Expense Splitter & Tracker"
    debug: bool = False

    # ── Supabase (PostgreSQL Cloud) ──
    supabase_url: str = ""
    supabase_key: str = ""                         # Service Role Key or Anon Key
    supabase_service_role_key: str = ""
    database_url: str = ""                         # Direct PostgreSQL URI

    # ── JWT Authentication ──
    jwt_secret: str = "change-this-to-a-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30       # Access token lives for 30 minutes
    refresh_token_expire_days: int = 7          # Refresh token lives for 7 days

    # ── CORS ──
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # ── Gemini AI ──
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # ── Email (Resend) ──
    resend_api_key: str = ""
    email_from: str = "Divvy <noreply@yourdomain.com>"

    # ── Default App Settings ──
    default_currency: str = "INR"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
