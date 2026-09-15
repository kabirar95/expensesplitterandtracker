# ============================================================
# RECURRING EXPENSE MODEL — Pydantic representation
# ============================================================

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class RecurringExpense(BaseModel):
    """
    Represents an automated recurring expense rule for bills and subscriptions.
    Can be personal or group-associated.
    """
    id: str
    user_id: str
    description: str
    amount: float
    currency: str = "INR"
    category: str = "rent"
    frequency: str = "monthly"  # "daily", "weekly", "monthly", "yearly"
    start_date: date
    next_run_date: date
    last_run_date: Optional[date] = None
    is_active: bool = True
    is_group: bool = False
    group_id: Optional[str] = None
    paid_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
