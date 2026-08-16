# ============================================================
# PERSONAL EXPENSE SCHEMAS — Input & Output Data Validation
# ============================================================

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field


class CreatePersonalExpenseRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    category: str = Field(default="food")
    expense_date: Optional[date] = None
    notes: Optional[str] = None


class PersonalExpenseResponse(BaseModel):
    id: str
    user_id: str
    description: str
    amount: float
    category: str
    expense_date: date
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
