# ============================================================
# CONFIGURATION — All settings loaded from environment variables
# ============================================================
# This file uses Pydantic Settings to load config from .env files.
# Never hardcode secrets here — always use environment variables.
# ============================================================

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Pydantic Settings automatically reads from:
    1. Environment variables (highest priority)
    2. .env file (fallback)
    
    Example: MONGODB_URL in .env → settings.mongodb_url in Python
    """

    # ── App Settings ──
    app_name: str = "Expense Splitter & Tracker"
    debug: bool = False

    # ── MongoDB ──
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "expense_splitter"

    # ── JWT Authentication ──
    jwt_secret: str = "change-this-to-a-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30       # Access token lives for 30 minutes
    refresh_token_expire_days: int = 7          # Refresh token lives for 7 days

    # ── CORS (Cross-Origin Resource Sharing) ──
    # Which frontend URLs are allowed to call our API
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
        env_file = ".env"               # Load from .env file
        env_file_encoding = "utf-8"
        case_sensitive = False           # MONGODB_URL and mongodb_url both work


# Create a single instance — import this everywhere
settings = Settings()
