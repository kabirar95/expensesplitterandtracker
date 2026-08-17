# ============================================================
# GEMINI AI SERVICE — Financial Insights Engine
# ============================================================

import google.generativeai as genai
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
    Calls Google Gemini AI API to generate intelligent financial guidance.
    """
    if not settings.gemini_api_key or settings.gemini_api_key.startswith("AQ."):
        # Smart simulated advisory fallback if Gemini API key is placeholder
        return generate_rule_based_insight(
            user_message=user_message,
            monthly_spent=monthly_spent,
            overall_budget=overall_budget,
            category_budgets=category_budgets,
            recent_personal_expenses=recent_personal_expenses
        )

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)

        context_prompt = build_financial_context_prompt(
            user_name=user_name,
            selected_month=selected_month,
            monthly_spent=monthly_spent,
            yearly_spent=yearly_spent,
            overall_budget=overall_budget,
            category_budgets=category_budgets,
            recent_personal_expenses=recent_personal_expenses,
            group_balances=group_balances
        )

        full_prompt = f"{DIVVY_AI_SYSTEM_PROMPT}\n\n{context_prompt}\n\nUSER QUESTION: {user_message}"

        response = model.generate_content(full_prompt)
        if response and response.text:
            return response.text.strip()
        else:
            return generate_rule_based_insight(
                user_message=user_message,
                monthly_spent=monthly_spent,
                overall_budget=overall_budget,
                category_budgets=category_budgets,
                recent_personal_expenses=recent_personal_expenses
            )

    except Exception as e:
        print(f"⚠️ Gemini API Notice: {e}")
        return generate_rule_based_insight(
            user_message=user_message,
            monthly_spent=monthly_spent,
            overall_budget=overall_budget,
            category_budgets=category_budgets,
            recent_personal_expenses=recent_personal_expenses
        )


def generate_rule_based_insight(
    user_message: str,
    monthly_spent: float,
    overall_budget: float,
    category_budgets: list,
    recent_personal_expenses: list
) -> str:
    """
    High-value rule-based financial advisor fallback.
    """
    msg_lower = user_message.lower()

    if "spend" in msg_lower or "spent" in msg_lower or "total" in msg_lower:
        remaining = overall_budget - monthly_spent if overall_budget > 0 else 0
        rem_str = f"You have **₹{max(remaining, 0):,.2f}** left in your budget." if overall_budget > 0 else "You haven't set an overall budget limit yet!"
        if remaining < 0:
            rem_str = f"⚠️ You are currently **Over Budget by +₹{abs(remaining):,.2f}**!"

        return f"""📊 **Here is your active financial summary:**

- 💳 **Monthly Spent:** **₹{monthly_spent:,.2f}**
- 🎯 **Overall Budget Target:** **{"₹" + f"{overall_budget:,.2f}" if overall_budget > 0 else "Not Set"}**
- 🛡️ **Status:** {rem_str}

💡 *Pro Tip:* Keep tracking daily micro-expenses under category caps to keep your savings on target!"""

    elif "budget" in msg_lower or "cap" in msg_lower or "limit" in msg_lower:
        if overall_budget > 0:
            pct = round((monthly_spent / overall_budget) * 100)
            return f"""🎯 **Budget Performance Analysis:**

- You have used **{pct}%** of your monthly target budget (**₹{monthly_spent:,.2f}** of **₹{overall_budget:,.2f}**).
- Status: {"🟢 Safe & On Track" if pct < 75 else "🟡 Approaching Limit" if pct <= 100 else "🔴 Budget Exceeded"}

Need help adjusting a category budget? You can edit budget limits anytime from the Personal Tracker tab!"""
        else:
            return """💡 **No Overall Budget Set Yet!**

Setting a monthly budget target helps Divvy keep you informed when spending approaches limits. Click **'Set Main Budget'** on your Personal Tracker tab to set a cap!"""

    elif "tip" in msg_lower or "save" in msg_lower or "advice" in msg_lower:
        return """💡 **3 Actionable Money-Saving Tips for You:**

1. 🛒 **The 48-Hour Rule:** Wait 48 hours before non-essential purchases to reduce impulse spending.
2. 🍽️ **Meal Prep Strategy:** Cooking 2 extra meals a week can save over **₹3,000/month** in dining & delivery fees.
3. 👥 **Settle Shared Bills Fast:** Use Divvy's Group Expense Splitting to settle debts promptly so group IOUs don't lapse!"""

    else:
        return f"""🤖 **Divvy AI Insight:**

I analyzed your active financial data:
- **Total Monthly Spent:** **₹{monthly_spent:,.2f}**
- **Overall Budget:** **{"₹" + f"{overall_budget:,.2f}" if overall_budget > 0 else "Not Set"}**

Feel free to ask me questions like:
- *"How much did I spend this month?"*
- *"Am I over budget?"*
- *"Give me 3 savings tips"*"""
