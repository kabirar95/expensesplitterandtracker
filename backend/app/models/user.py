# ============================================================
# USER MODEL — How user data is stored in MongoDB
# ============================================================
# This is a Beanie Document — it defines the shape of documents
# in the "users" collection in MongoDB.
#
# Think of it like a table schema in SQL, but for MongoDB.
# Each instance of this class = one document in the collection.
# ============================================================

from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import EmailStr, Field


class User(Document):
    """
    Represents a registered user in the app.
    
    Stored in MongoDB collection: "users"
    """
    email: EmailStr                                     # "kabir@example.com" — must be unique
    username: str                                       # "kabir_r" — must be unique
    password_hash: str                                  # Bcrypt-hashed password (NEVER store plain text!)
    display_name: str                                   # "Kabir Ramteke" — shown in the UI
    avatar_url: Optional[str] = None                    # Profile picture URL
    default_currency: str = "INR"                       # User's preferred currency
    
    # Email digest preferences
    email_digest_enabled: bool = False                  # Weekly email summary toggle
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"                                  # MongoDB collection name
        indexes = [
            "email",                                    # Index on email for fast lookups
            "username",                                 # Index on username for fast lookups
        ]
