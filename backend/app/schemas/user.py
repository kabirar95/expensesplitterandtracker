# ============================================================
# USER SCHEMAS — Request/Response shapes for the API
# ============================================================
# Schemas define what data the API accepts (requests) and
# what data it returns (responses).
#
# Why separate from models?
# - Models = how data is stored in the DB (has password_hash)
# - Schemas = how data enters/leaves the API (has password, no hash)
#
# This separation is a security best practice — we never
# accidentally send the password hash to the frontend.
# ============================================================

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── Request Schemas (what the frontend sends) ──

class UserSignup(BaseModel):
    """Data needed to create a new account."""
    email: EmailStr                                     # Must be a valid email
    username: str = Field(..., min_length=3, max_length=30)  # 3-30 characters
    password: str = Field(..., min_length=6)            # At least 6 characters
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
    User data sent to the frontend.
    
    Notice: NO password_hash field! This is the whole point
    of separating models from schemas.
    """
    id: str                                             # MongoDB ObjectId as string
    email: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    default_currency: str
    email_digest_enabled: bool
    created_at: datetime


class TokenResponse(BaseModel):
    """JWT tokens returned after login/signup."""
    access_token: str                                   # Short-lived token (30 min)
    refresh_token: str                                  # Long-lived token (7 days)
    token_type: str = "bearer"                          # Always "bearer" for JWT
    user: UserResponse                                  # User info included for convenience


class TokenRefreshRequest(BaseModel):
    """Request to get a new access token using a refresh token."""
    refresh_token: str
