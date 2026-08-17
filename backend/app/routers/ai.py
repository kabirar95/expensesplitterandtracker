# ============================================================
# AI ASSISTANT ROUTER — Chat & Financial Insights Endpoints
# ============================================================

from fastapi import APIRouter, Depends
from app.schemas.ai import AIChatRequest, AIChatResponse
from app.middleware.auth import get_current_user
from app.services.ai_service import generate_ai_response

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
