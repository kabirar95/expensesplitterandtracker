# ============================================================
# RECURRING EXPENSE SCHEMAS — Input & Output Data Validation
# ============================================================

from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field


class CreateRecurringExpenseRequest(BaseModel):
    description: str = Field(..., min_length=1, max_length=200)
    amount: float = Field(..., gt=0)
    currency: str = Field(default="INR")
    category: str = Field(default="rent")
    frequency: str = Field(default="monthly")  # "daily", "weekly", "monthly", "yearly"
    start_date: Optional[date] = None
    next_run_date: Optional[date] = None
    is_active: bool = True
    is_group: bool = False
    group_id: Optional[str] = None
    paid_by: Optional[str] = None
    notes: Optional[str] = None


class UpdateRecurringExpenseRequest(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    frequency: Optional[str] = None
    next_run_date: Optional[date] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class RecurringExpenseResponse(BaseModel):
    id: str
    user_id: str
    description: str
    amount: float
    currency: str
    category: str
    frequency: str
    start_date: date
    next_run_date: date
    last_run_date: Optional[date] = None
    is_active: bool
    is_group: bool
    group_id: Optional[str] = None
    paid_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProcessRecurringDueResponse(BaseModel):
    processed_count: int
    logged_descriptions: List[str]
    message: str
