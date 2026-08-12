# ============================================================
# EXPENSES ROUTER — Group Expense Management API Endpoints
# ============================================================

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user import UserProfile
from app.schemas.expense import (
    CreateExpenseRequest,
    UpdateExpenseRequest,
    ExpenseResponse,
    SplitDetail,
)
from app.services.split_service import calculate_splits
from app.middleware.auth import get_current_user
from app.database import get_supabase
from app.routers.groups import _local_groups_db

router = APIRouter(prefix="/api", tags=["Expenses"])

_local_expenses_db = {}


def _expense_to_response(expense: dict) -> ExpenseResponse:
    splits_raw = expense.get("splits", [])
    formatted_splits = []
    for s in splits_raw:
        if isinstance(s, dict):
            formatted_splits.append(
                SplitDetail(
                    user_name=s.get("user_name", ""),
                    amount=float(s.get("amount", 0)),
                    percentage=s.get("percentage"),
                )
            )
    return ExpenseResponse(
        id=str(expense.get("id")),
        group_id=str(expense.get("group_id")),
        description=expense.get("description", ""),
        amount=float(expense.get("amount", 0)),
        currency=expense.get("currency", "INR"),
        category=expense.get("category", "food"),
        paid_by=expense.get("paid_by", ""),
        split_type=expense.get("split_type", "equal"),
        splits=formatted_splits,
        notes=expense.get("notes"),
        created_by=str(expense.get("created_by")),
        created_at=expense.get("created_at") or datetime.utcnow(),
        updated_at=expense.get("updated_at") or datetime.utcnow(),
    )


@router.post("/groups/{group_id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_group_expense(
    group_id: str,
    data: CreateExpenseRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Add a new expense to a group and automatically calculate splits.
    """
    group = _local_groups_db.get(group_id)
    
    supabase = get_supabase()
    if supabase and not group:
        try:
            res = supabase.table("groups").select("*").eq("id", group_id).execute()
            if res.data:
                group = res.data[0]
        except Exception as e:
            print(f"Supabase read notice: {e}")

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member_names = [m.get("name") if isinstance(m, dict) else m for m in group.get("members", [])]
    if data.paid_by not in member_names:
        raise HTTPException(status_code=400, detail=f"Payer '{data.paid_by}' is not a member of this group")

    # Calculate splits
    try:
        calculated_splits = calculate_splits(
            total_amount=data.amount,
            split_type=data.split_type,
            member_names=member_names,
            custom_splits=data.splits,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    expense_id = str(uuid.uuid4())
    splits_dict = [s.model_dump() for s in calculated_splits]

    new_expense = {
        "id": expense_id,
        "group_id": group_id,
        "description": data.description,
        "amount": data.amount,
        "currency": data.currency,
        "category": data.category,
        "paid_by": data.paid_by,
        "split_type": data.split_type,
        "splits": splits_dict,
        "notes": data.notes,
        "created_by": str(current_user.id),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    if supabase:
        try:
            res = supabase.table("expenses").insert(new_expense).execute()
            if res.data:
                return _expense_to_response(res.data[0])
        except Exception as e:
            print(f"Supabase expense write notice: {e}")

    _local_expenses_db[expense_id] = new_expense
    return _expense_to_response(new_expense)


@router.get("/groups/{group_id}/expenses", response_model=list[ExpenseResponse])
async def list_group_expenses(
    group_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    List all expenses for a specific group.
    """
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("expenses").select("*").eq("group_id", group_id).execute()
            if res.data:
                return [_expense_to_response(e) for e in res.data]
        except Exception as e:
            print(f"Supabase read notice: {e}")

    expenses = [e for e in _local_expenses_db.values() if e.get("group_id") == group_id]
    return [_expense_to_response(e) for e in expenses]


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Delete an expense.
    """
    supabase = get_supabase()
    if supabase:
        try:
            supabase.table("expenses").delete().eq("id", expense_id).execute()
        except Exception as e:
            print(f"Supabase delete notice: {e}")

    if expense_id in _local_expenses_db:
        del _local_expenses_db[expense_id]
    return None
