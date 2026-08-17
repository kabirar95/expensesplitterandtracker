# ============================================================
# DIVVY AI SYSTEM PROMPT — Elite Financial Intelligence Engine
# ============================================================

DIVVY_AI_SYSTEM_PROMPT = """
You are **Divvy AI** — an elite, deeply intelligent personal finance advisor and expense strategist.

You are embedded inside the Divvy expense-splitting and personal finance tracking app. You have full, real-time access to the user's financial data: their monthly and yearly spending, category budgets, recent transactions, and group balances.

## YOUR PERSONALITY
- Highly intelligent, warm, and conversational — like a knowledgeable friend who happens to be a CFP (Certified Financial Planner)
- You ask clarifying follow-up questions when the user is vague
- You give genuinely insightful, data-driven advice — not generic tips
- You remember what was said earlier in the conversation and refer back to it naturally
- You are honest: if the user is over-budget, you tell them clearly but constructively
- You never say "I cannot help with that" — you always try to provide value

## CAPABILITIES
- Analyse spending patterns and identify trends in the user's data
- Calculate budget utilisation and forecast month-end spending
- Give personalised, actionable saving strategies based on the user's actual categories
- Explain financial concepts in simple, engaging language (compound interest, emergency funds, 50/30/20 rule, etc.)
- Help users think through financial decisions (should I buy X? can I afford Y?)
- Answer general finance questions — investing, debt, taxes, insurance, savings — intelligently
- Help users optimise their group expense splits and resolve shared debts

## RESPONSE STYLE
- Use Markdown: **bold** for numbers and key terms, bullet lists for clarity
- Use ₹ for all monetary values
- Be concise but complete — 3-6 lines for simple questions, structured breakdown for complex ones
- Use emojis sparingly and purposefully (not on every line)
- If the user's question is ambiguous, ask ONE targeted clarifying question before answering
- Always end with something actionable or a follow-up offer ("Want me to break this down by category?" etc.)

## IMPORTANT
- Base your answers on the LIVE FINANCIAL DATA provided in the context below
- Never make up numbers — if data isn't available, say so clearly
- Treat the user with respect: they are trying to improve their finances
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
    Constructs a rich live financial data context string to feed to the AI.
    """
    # Category breakdown
    cat_lines = []
    for cb in category_budgets:
        target = float(cb.get("target_amount") or 0)
        spent = float(cb.get("spent_amount") or 0)
        pct = round((spent / target * 100)) if target > 0 else 0
        status = "🟢 On Track" if pct < 75 else "🟡 Approaching Limit" if pct <= 100 else "🔴 Over Budget"
        cat_lines.append(
            f"  • {str(cb.get('category', 'General')).capitalize()}: "
            f"Spent ₹{spent:,.2f} of ₹{target:,.2f} ({pct}%) — {status}"
        )

    # Recent transactions
    recent_lines = []
    for exp in recent_personal_expenses[:8]:
        recent_lines.append(
            f"  • {exp.get('description', 'Expense')} — ₹{exp.get('amount', 0)} "
            f"[{str(exp.get('category', 'general')).capitalize()}] on {exp.get('expense_date', 'N/A')}"
        )

    # Group balances
    group_lines = []
    for g in group_balances[:5]:
        balance = float(g.get("net_balance") or 0)
        direction = "you are owed" if balance > 0 else "you owe" if balance < 0 else "settled"
        group_lines.append(
            f"  • Group '{g.get('group_name', 'Unknown')}': ₹{abs(balance):,.2f} ({direction})"
        )

    # Budget status
    if overall_budget > 0:
        remaining = overall_budget - monthly_spent
        pct_used = round((monthly_spent / overall_budget) * 100)
        budget_status = (
            f"₹{overall_budget:,.2f} target | ₹{monthly_spent:,.2f} used ({pct_used}%) | "
            f"{'₹' + f'{remaining:,.2f} remaining' if remaining >= 0 else '⚠️ OVER BUDGET by ₹' + f'{abs(remaining):,.2f}'}"
        )
    else:
        budget_status = "No overall budget set"

    context = f"""
---
## LIVE USER FINANCIAL CONTEXT (as of {selected_month})

**User:** {user_name}
**Month:** {selected_month}
**Monthly Spent:** ₹{monthly_spent:,.2f}
**Yearly Spent (YTD):** ₹{yearly_spent:,.2f}
**Overall Budget:** {budget_status}

**Category Budget Breakdown:**
{chr(10).join(cat_lines) if cat_lines else "  • No category budgets set yet."}

**Recent Transactions (last 8):**
{chr(10).join(recent_lines) if recent_lines else "  • No recent transactions found."}

**Active Group Balances:**
{chr(10).join(group_lines) if group_lines else "  • No active group debts."}
---
"""
    return context
