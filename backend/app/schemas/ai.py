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


class ParseExpenseRequest(BaseModel):
    text: str


class ParsedExpenseResponse(BaseModel):
    description: str
    amount: float
    category: str
    expense_date: str
    payment_method: Optional[str] = "UPI"
    notes: Optional[str] = None
    confidence: Optional[float] = 1.0


class CategorizeRequest(BaseModel):
    description: str
    amount: Optional[float] = None


class CategorizeResponse(BaseModel):
    category: str
    confidence: Optional[float] = 1.0
    rationale: Optional[str] = None


class AIPredictionRequest(BaseModel):
    selected_month: Optional[str] = None
    monthly_spent: Optional[float] = 0.0
    overall_budget: Optional[float] = 0.0
    category_budgets: Optional[List[Dict[str, Any]]] = []
    recent_personal_expenses: Optional[List[Dict[str, Any]]] = []


class AIPredictionResponse(BaseModel):
    predicted_monthly_total: float
    projected_savings_or_deficit: float
    risk_level: str  # "low", "medium", "high"
    insights: List[str]
    tips: List[str]
