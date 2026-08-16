# ============================================================
# BUDGETS ROUTER — API Endpoints
# ============================================================

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user import UserProfile
from app.schemas.budget import SetBudgetRequest, BudgetResponse
from app.middleware.auth import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])

_local_budgets_db = {}


@router.post("", response_model=BudgetResponse)
async def set_category_budget(
    data: SetBudgetRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    current_month_year = data.month_year or datetime.utcnow().strftime("%Y-%m")
    category_key = data.category.lower()

    supabase = get_supabase()
    existing_budget = None

    if supabase:
        try:
            res = (
                supabase.table("budgets")
                .select("*")
                .eq("user_id", str(current_user.id))
                .eq("category", category_key)
                .eq("month_year", current_month_year)
                .execute()
            )
            if res.data and len(res.data) > 0:
                existing_budget = res.data[0]
        except Exception as e:
            print(f"Supabase budget check notice: {e}")

    b_id = existing_budget.get("id") if existing_budget else str(uuid.uuid4())
    budget_data = {
        "id": b_id,
        "user_id": str(current_user.id),
        "category": category_key,
        "target_amount": data.target_amount,
        "month_year": current_month_year,
        "created_at": existing_budget.get("created_at") if existing_budget else datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    if supabase:
        try:
            supabase.table("budgets").upsert(budget_data, on_conflict="user_id,category,month_year").execute()
        except Exception as e:
            print(f"Supabase budget upsert notice: {e}")

    _local_budgets_db[f"{current_user.id}_{category_key}_{current_month_year}"] = budget_data

    return BudgetResponse(
        id=b_id,
        user_id=str(current_user.id),
        category=category_key,
        target_amount=data.target_amount,
        month_year=current_month_year,
        spent_amount=0.0,
        created_at=budget_data.get("created_at") or datetime.utcnow(),
        updated_at=budget_data.get("updated_at") or datetime.utcnow(),
    )


@router.get("", response_model=list[BudgetResponse])
async def list_my_budgets(
    month_year: str = None,
    current_user: UserProfile = Depends(get_current_user),
):
    target_month = month_year or datetime.utcnow().strftime("%Y-%m")
    user_id_str = str(current_user.id)

    supabase = get_supabase()
    budgets_list = []
    expenses_list = []

    if supabase:
        try:
            b_res = (
                supabase.table("budgets")
                .select("*")
                .eq("user_id", user_id_str)
                .eq("month_year", target_month)
                .execute()
            )
            if b_res.data:
                budgets_list = b_res.data

            e_res = (
                supabase.table("personal_expenses")
                .select("*")
                .eq("user_id", user_id_str)
                .execute()
            )
            if e_res.data:
                expenses_list = e_res.data
        except Exception as e:
            print(f"Supabase budget fetch notice: {e}")

    if not budgets_list:
        budgets_list = [
            b for b in _local_budgets_db.values()
            if b.get("user_id") == user_id_str and b.get("month_year") == target_month
        ]

    spent_by_category = {}
    for exp in expenses_list:
        exp_date_str = str(exp.get("expense_date", ""))
        # Filter expense by target month_year prefix (e.g. "2026-08")
        if target_month and not exp_date_str.startswith(target_month):
            continue
        c = exp.get("category", "").lower()
        amt = float(exp.get("amount", 0))
        spent_by_category[c] = spent_by_category.get(c, 0.0) + amt

    response = []
    for b in budgets_list:
        cat = b.get("category", "").lower()
        spent = spent_by_category.get(cat, 0.0)
        response.append(
            BudgetResponse(
                id=str(b.get("id")),
                user_id=str(b.get("user_id")),
                category=cat,
                target_amount=float(b.get("target_amount", 0)),
                month_year=b.get("month_year", target_month),
                spent_amount=spent,
                created_at=b.get("created_at") or datetime.utcnow(),
                updated_at=b.get("updated_at") or datetime.utcnow(),
            )
        )

    return response
