# ============================================================
# USER SCHEMAS — Request/Response shapes for the API
# ============================================================
# Schemas define what data the API accepts (requests) and
# what data it returns (responses).
# ============================================================

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── Request Schemas (what the frontend sends) ──

class UserSignup(BaseModel):
    """Data needed to create a new account."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6)
    display_name: str = Field(..., min_length=1, max_length=100)


class UserLogin(BaseModel):
    """Data needed to log in."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Data that can be updated on a profile."""
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    default_currency: Optional[str] = None
    email_digest_enabled: Optional[bool] = None


# ── Response Schemas (what the API sends back) ──

class UserResponse(BaseModel):
    """
    User data sent to the frontend (password_hash is omitted).
    """
    id: str                                             # Supabase UUID as string
    email: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    default_currency: str = "INR"
    email_digest_enabled: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT tokens returned after login/signup."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    """Request to get a new access token using a refresh token."""
    refresh_token: str
