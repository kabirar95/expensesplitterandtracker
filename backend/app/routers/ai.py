# ============================================================
# AI ASSISTANT ROUTER — Chat & Financial Insights Endpoints
# ============================================================

from fastapi import APIRouter, Depends
from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    ParseExpenseRequest,
    ParsedExpenseResponse,
    CategorizeRequest,
    CategorizeResponse,
    AIPredictionRequest,
    AIPredictionResponse,
)
from app.middleware.auth import get_current_user
from app.services.ai_service import (
    generate_ai_response,
    parse_expense_text,
    auto_categorize_text,
    generate_spending_prediction,
)

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=AIChatResponse)
def ai_chat(
    payload: AIChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate interactive financial advice using Divvy AI (Google Gemini API).
    """
    user_name = getattr(current_user, "full_name", None) or (getattr(current_user, "email", "User") or "User").split("@")[0]

    reply_text = generate_ai_response(
        user_message=payload.message,
        user_name=user_name,
        selected_month=payload.selected_month,
        monthly_spent=payload.monthly_spent,
        yearly_spent=payload.yearly_spent,
        overall_budget=payload.overall_budget,
        category_budgets=payload.category_budgets or [],
        recent_personal_expenses=payload.recent_personal_expenses or [],
        group_balances=payload.group_balances or [],
        chat_history=payload.chat_history or []
    )

    return AIChatResponse(reply=reply_text)


@router.post("/parse-expense", response_model=ParsedExpenseResponse)
def ai_parse_expense(
    payload: ParseExpenseRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Parse unstructured bank debit SMS or natural language expense note into structured fields.
    """
    result = parse_expense_text(payload.text)
    return ParsedExpenseResponse(**result)


@router.post("/categorize", response_model=CategorizeResponse)
def ai_categorize(
    payload: CategorizeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Auto-categorize an expense title/merchant name into Divvy's categories.
    """
    result = auto_categorize_text(payload.description, payload.amount)
    return CategorizeResponse(**result)


@router.post("/predict", response_model=AIPredictionResponse)
def ai_predict(
    payload: AIPredictionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate spending velocity and projected month-end forecast with AI tips.
    """
    result = generate_spending_prediction(
        selected_month=payload.selected_month or "current",
        monthly_spent=payload.monthly_spent or 0.0,
        overall_budget=payload.overall_budget or 0.0,
        category_budgets=payload.category_budgets or [],
        recent_personal_expenses=payload.recent_personal_expenses or [],
    )
    return AIPredictionResponse(**result)
