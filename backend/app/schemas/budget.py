# ============================================================
# BUDGET SCHEMAS — Input & Output Data Validation
# ============================================================

from datetime import datetime
from pydantic import BaseModel, Field


class SetBudgetRequest(BaseModel):
    category: str = Field(..., min_length=1)
    target_amount: float = Field(..., gt=0)
    month_year: Optional[str] = None  # Format: "YYYY-MM"


class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    target_amount: float
    month_year: str
    spent_amount: float = 0.0
    created_at: datetime
    updated_at: datetime
