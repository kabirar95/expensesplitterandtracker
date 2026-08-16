# ============================================================
# BUDGET MODEL — Pydantic representation
# ============================================================

from datetime import datetime
from pydantic import BaseModel


class Budget(BaseModel):
    """
    Represents a category budget limit record in Supabase 'budgets' table.
    """
    id: str
    user_id: str
    category: str
    target_amount: float
    month_year: str  # Format: "YYYY-MM" e.g. "2026-08"
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()
