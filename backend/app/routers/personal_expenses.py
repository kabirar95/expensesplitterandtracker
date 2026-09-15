# ============================================================
# PERSONAL EXPENSES ROUTER — API Endpoints
# ============================================================

import uuid
import csv
from io import StringIO
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import Response

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


@router.get("/export/csv")
async def export_personal_expenses_csv(
    month_year: str = None,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Download personal expenses as a structured CSV spreadsheet.
    """
    supabase = get_supabase()
    expenses = []
    if supabase:
        try:
            query = supabase.table("personal_expenses").select("*").eq("user_id", str(current_user.id))
            if month_year:
                import calendar
                try:
                    y, m = map(int, month_year.split("-"))
                    last_day = calendar.monthrange(y, m)[1]
                    query = query.gte("expense_date", f"{month_year}-01").lte("expense_date", f"{month_year}-{last_day:02d}")
                except Exception:
                    pass
            res = query.order("expense_date", desc=True).execute()
            if res.data:
                expenses = res.data
        except Exception as e:
            print(f"Supabase CSV export query error: {e}")

    if not expenses:
        expenses = [
            e for e in _local_personal_expenses_db.values()
            if e.get("user_id") == str(current_user.id)
            and (not month_year or str(e.get("expense_date", "")).startswith(month_year))
        ]

    # Generate CSV in memory
    output = StringIO()
    writer = csv.writer(output)
    # Write header
    writer.writerow(["Expense ID", "Date", "Description", "Category", "Amount (INR)", "Notes", "Created At"])

    for exp in expenses:
        writer.writerow([
            exp.get("id", ""),
            exp.get("expense_date", ""),
            exp.get("description", ""),
            str(exp.get("category", "")).capitalize(),
            f"{float(exp.get('amount', 0)):.2f}",
            exp.get("notes", ""),
            exp.get("created_at", "")
        ])

    filename = f"divvy_personal_expenses_{month_year or 'all'}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


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
