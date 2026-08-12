# ============================================================
# GROUP MODEL — Group Document / Table Shape
# ============================================================

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class GroupMember(BaseModel):
    """
    Member of a group — just a name string (no account required)!
    """
    name: str                                           # "Rahul", "Priya", "Kabir"
    added_at: datetime = Field(default_factory=datetime.utcnow)


class Group(BaseModel):
    """
    Represents an expense splitting group (e.g. "Goa Trip", "Roommates").
    """
    id: Optional[str] = None                             # Supabase UUID / ID string
    name: str                                           # "Goa Trip 🌴"
    description: Optional[str] = None                   # "Expenses for Goa vacation"
    category: str = "trip"                              # "trip" | "home" | "couple" | "other"
    created_by: str                                     # User ID of creator
    members: List[GroupMember] = []                     # List of member names
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
