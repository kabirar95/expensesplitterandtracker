# ============================================================
# EXPENSE MODEL — Group Expense Shape
# ============================================================

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ExpenseSplit(BaseModel):
    """
    Split breakdown for one member in an expense.
    """
    user_name: str                                      # Member name (e.g. "Rahul")
    amount: float                                       # Owed amount (e.g. 500.0)
    percentage: Optional[float] = None                  # Optional percentage (e.g. 33.33)


class Expense(BaseModel):
    """
    Represents an expense added to a group.
    """
    id: Optional[str] = None                             # Expense ID
    group_id: str                                       # Group ID it belongs to
    description: str                                    # "Seafood Dinner at Brittos"
    amount: float                                       # Total expense amount (e.g. 1500.0)
    currency: str = "INR"                               # "INR", "USD"
    category: str = "food"                              # "food", "transport", "housing", etc.
    paid_by: str                                        # Member name who paid (e.g. "Kabir")
    split_type: str = "equal"                           # "equal" | "percentage" | "exact"
    splits: List[ExpenseSplit] = []                     # Member split breakdowns
    notes: Optional[str] = None
    created_by: str                                     # User ID who logged the expense
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
