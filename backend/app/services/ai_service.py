# ============================================================
# DIVVY AI SERVICE — Gemini-Powered Financial Intelligence
# ============================================================

from google import genai
from google.genai import types
from app.config import settings
from app.prompts.financial_advisor import DIVVY_AI_SYSTEM_PROMPT, build_financial_context_prompt


def generate_ai_response(
    user_message: str,
    user_name: str,
    selected_month: str,
    monthly_spent: float,
    yearly_spent: float,
    overall_budget: float,
    category_budgets: list,
    recent_personal_expenses: list,
    group_balances: list,
    chat_history: list = None
) -> str:
    """
    Calls Google Gemini AI to generate intelligent, context-aware financial guidance.
    Supports multi-turn conversation history for a true GPT-like experience.
    """
    if not settings.gemini_api_key:
        return "⚠️ Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file."

    try:
        client = genai.Client(api_key=settings.gemini_api_key)

        # Build financial context block injected into the system prompt
        context_block = build_financial_context_prompt(
            user_name=user_name,
            selected_month=selected_month,
            monthly_spent=monthly_spent,
            yearly_spent=yearly_spent,
            overall_budget=overall_budget,
            category_budgets=category_budgets,
            recent_personal_expenses=recent_personal_expenses,
            group_balances=group_balances
        )

        full_system_prompt = f"{DIVVY_AI_SYSTEM_PROMPT}\n\n{context_block}"

        # Build conversation history (multi-turn memory)
        contents = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg.get("sender") == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=msg.get("text", ""))]
                    )
                )

        # Add the current user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=user_message)]
            )
        )

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=full_system_prompt,
                temperature=0.7,
                max_output_tokens=1024,
            )
        )

        if response and response.text:
            return response.text.strip()
        else:
            return "I wasn't able to generate a response. Please try again."

    except Exception as e:
        print(f"⚠️ Gemini API Error: {e}")
        return f"⚠️ AI Error: {str(e)}"
