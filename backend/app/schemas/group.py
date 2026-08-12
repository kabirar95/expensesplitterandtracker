# ============================================================
# GROUP SCHEMAS — API Request & Response Models
# ============================================================

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AddMemberRequest(BaseModel):
    """Request payload for adding a member name to a group."""
    name: str = Field(..., min_length=1, max_length=50)


class CreateGroupRequest(BaseModel):
    """Request payload for creating a new group."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str = "trip"                              # "trip" | "home" | "couple" | "other"
    members: List[str] = []                             # Initial list of member names


class UpdateGroupRequest(BaseModel):
    """Request payload for updating group details."""
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class GroupMemberResponse(BaseModel):
    name: str
    added_at: datetime


class GroupResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: str
    created_by: str
    members: List[GroupMemberResponse]
    created_at: datetime
    updated_at: datetime
