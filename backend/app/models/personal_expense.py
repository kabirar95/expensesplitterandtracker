# ============================================================
# PERSONAL EXPENSE MODEL — Pydantic representation
# ============================================================

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class PersonalExpense(BaseModel):
    """
    Represents a personal expense record in Supabase 'personal_expenses' table.
    """
    id: str
    user_id: str
    description: str
    amount: float
    category: str = "food"
    expense_date: date
    notes: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
