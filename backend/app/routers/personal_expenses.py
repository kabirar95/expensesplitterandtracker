# ============================================================
# PERSONAL EXPENSES ROUTER — API Endpoints
# ============================================================

import uuid
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user import UserProfile
from app.schemas.personal_expense import (
    CreatePersonalExpenseRequest,
    PersonalExpenseResponse,
)
from app.middleware.auth import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/api/personal-expenses", tags=["Personal Expenses"])

_local_personal_expenses_db = {}


def _expense_to_response(exp: dict) -> PersonalExpenseResponse:
    expense_date_val = exp.get("expense_date")
    if isinstance(expense_date_val, str):
        try:
            expense_date_obj = date.fromisoformat(expense_date_val)
        except ValueError:
            expense_date_obj = date.today()
    elif isinstance(expense_date_val, date):
        expense_date_obj = expense_date_val
    else:
        expense_date_obj = date.today()

    return PersonalExpenseResponse(
        id=str(exp.get("id")),
        user_id=str(exp.get("user_id")),
        description=exp.get("description", ""),
        amount=float(exp.get("amount", 0)),
        category=exp.get("category", "food"),
        expense_date=expense_date_obj,
        notes=exp.get("notes"),
        created_at=exp.get("created_at") or datetime.utcnow(),
        updated_at=exp.get("updated_at") or datetime.utcnow(),
    )


@router.post("", response_model=PersonalExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_personal_expense(
    data: CreatePersonalExpenseRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    exp_id = str(uuid.uuid4())
    exp_date = data.expense_date or date.today()

    new_expense = {
        "id": exp_id,
        "user_id": str(current_user.id),
        "description": data.description,
        "amount": data.amount,
        "category": data.category.lower(),
        "expense_date": exp_date.isoformat(),
        "notes": data.notes,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("personal_expenses").insert(new_expense).execute()
            if res.data:
                return _expense_to_response(res.data[0])
        except Exception as e:
            print(f"Supabase personal expense write notice: {e}")

    _local_personal_expenses_db[exp_id] = new_expense
    return _expense_to_response(new_expense)


@router.get("", response_model=list[PersonalExpenseResponse])
async def list_my_personal_expenses(
    current_user: UserProfile = Depends(get_current_user),
):
    supabase = get_supabase()
    if supabase:
        try:
            res = (
                supabase.table("personal_expenses")
                .select("*")
                .eq("user_id", str(current_user.id))
                .order("expense_date", desc=True)
                .execute()
            )
            if res.data:
                return [_expense_to_response(e) for e in res.data]
        except Exception as e:
            print(f"Supabase personal expense read notice: {e}")

    items = [
        _expense_to_response(e)
        for e in _local_personal_expenses_db.values()
        if e.get("user_id") == str(current_user.id)
    ]
    items.sort(key=lambda x: x.expense_date, reverse=True)
    return items


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_personal_expense(
    expense_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    supabase = get_supabase()
    if supabase:
        try:
            supabase.table("personal_expenses").delete().eq("id", expense_id).eq("user_id", str(current_user.id)).execute()
        except Exception as e:
            print(f"Supabase personal expense delete notice: {e}")

    _local_personal_expenses_db.pop(expense_id, None)
    return None
