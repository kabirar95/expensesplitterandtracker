# ============================================================
# USER PROFILE MODEL — Supabase PostgreSQL Table Shape
# ============================================================

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserProfile(BaseModel):
    """
    Represents a user profile record in the Supabase 'profiles' table.
    """
    id: str                                             # Supabase UUID
    email: EmailStr
    username: str
    password_hash: str
    display_name: str
    avatar_url: Optional[str] = None
    default_currency: str = "INR"
    email_digest_enabled: bool = False
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
