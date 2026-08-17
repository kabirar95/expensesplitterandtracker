# ============================================================
# FINANCIAL ADVISOR PROMPT TEMPLATES
# ============================================================

DIVVY_AI_SYSTEM_PROMPT = """
You are Divvy AI — an elite, hyper-intelligent, empathetic personal finance advisor and expense splitting strategist built for the Divvy app.

Your goal is to give clear, concise, actionable financial advice based on the user's real-time financial context.

RULES:
1. Always be encouraging, smart, and direct. Avoid generic filler.
2. Format responses with clean Markdown bullet points, bold numbers, and relevant emojis.
3. Use the user's provided real-time expense data, category budgets, and group balances to answer specifically.
4. If the user asks a question about their spending, refer directly to the numbers in their context.
5. Provide practical, high-value money-saving tips when asked.
6. Use currency symbol (₹) for all monetary values.
7. Keep answers under 3-4 short paragraphs or key bullet points.
"""

def build_financial_context_prompt(
    user_name: str,
    selected_month: str,
    monthly_spent: float,
    yearly_spent: float,
    overall_budget: float,
    category_budgets: list,
    recent_personal_expenses: list,
    group_balances: list
) -> str:
    """
    Constructs a rich live financial data context string to feed to Gemini AI.
    """
    cat_summary = []
    for cb in category_budgets:
        target = cb.get("target_amount", 0)
        spent = cb.get("spent_amount", 0)
        pct = round((spent / target * 100)) if target > 0 else 0
        cat_summary.append(f"- {cb.get('category').capitalize()}: Spent ₹{spent:,.2f} of ₹{target:,.2f} ({pct}%)")

    recent_summary = []
    for exp in recent_personal_expenses[:5]:
        recent_summary.append(f"- {exp.get('description')} (₹{exp.get('amount')}) on {exp.get('category')} ({exp.get('expense_date')})")

    group_summary = []
    for g in group_balances[:3]:
        group_summary.append(f"- Group '{g.get('group_name')}': Net Balance ₹{g.get('net_balance'):,.2f}")

    context = f"""
LIVE USER FINANCIAL CONTEXT:
- User Name: {user_name}
- Active Month: {selected_month}
- Monthly Spent (Selected Month): ₹{monthly_spent:,.2f}
- Yearly Spent (Current Year): ₹{yearly_spent:,.2f}
- Overall Monthly Target Budget: {"₹" + f"{overall_budget:,.2f}" if overall_budget > 0 else "Not Set"}
- Remaining Cap: {"₹" + f"{(overall_budget - monthly_spent):,.2f}" if overall_budget > 0 else "N/A"}

CATEGORY BUDGET BREAKDOWN:
{chr(10).join(cat_summary) if cat_summary else "No category budgets set."}

RECENT PERSONAL TRANSACTIONS:
{chr(10).join(recent_summary) if recent_summary else "No recent transactions."}

ACTIVE GROUP BALANCES:
{chr(10).join(group_summary) if group_summary else "No active group debts."}
"""
    return context
