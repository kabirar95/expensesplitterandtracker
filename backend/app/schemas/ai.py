# ============================================================
# AI ASSISTANT SCHEMAS
# ============================================================

from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class AIChatRequest(BaseModel):
    message: str
    selected_month: Optional[str] = "2026-08"
    monthly_spent: Optional[float] = 0.0
    yearly_spent: Optional[float] = 0.0
    overall_budget: Optional[float] = 0.0
    category_budgets: Optional[List[Dict[str, Any]]] = []
    recent_personal_expenses: Optional[List[Dict[str, Any]]] = []
    group_balances: Optional[List[Dict[str, Any]]] = []
    chat_history: Optional[List[Dict[str, Any]]] = []


class AIChatResponse(BaseModel):
    reply: str
