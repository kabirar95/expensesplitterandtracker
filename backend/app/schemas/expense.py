# ============================================================
# EXPENSE SCHEMAS — API Request & Response Models
# ============================================================

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SplitDetail(BaseModel):
    user_name: str
    amount: float
    percentage: Optional[float] = None


class CreateExpenseRequest(BaseModel):
    """Request payload for creating a group expense."""
    description: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    currency: str = "INR"
    category: str = "food"
    paid_by: str                                        # Member name who paid
    split_type: str = "equal"                           # "equal" | "percentage" | "exact"
    splits: Optional[List[SplitDetail]] = None          # Custom splits if not equal
    notes: Optional[str] = None


class UpdateExpenseRequest(BaseModel):
    """Request payload for updating an expense."""
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    paid_by: Optional[str] = None
    split_type: Optional[str] = None
    splits: Optional[List[SplitDetail]] = None
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: str
    group_id: str
    description: str
    amount: float
    currency: str
    category: str
    paid_by: str
    split_type: str
    splits: List[SplitDetail]
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
