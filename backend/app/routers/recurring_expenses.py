# ============================================================
# RECURRING EXPENSES ROUTER — API Endpoints
# ============================================================

import uuid
import calendar
from datetime import datetime, date, timedelta
from typing import List
from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user import UserProfile
from app.schemas.recurring_expense import (
    CreateRecurringExpenseRequest,
    UpdateRecurringExpenseRequest,
    RecurringExpenseResponse,
    ProcessRecurringDueResponse,
)
from app.middleware.auth import get_current_user
from app.database import get_supabase
from app.routers.personal_expenses import _local_personal_expenses_db

router = APIRouter(prefix="/api/recurring", tags=["Recurring Expenses"])

_local_recurring_db = {}


def _calculate_next_date(current: date, frequency: str) -> date:
    """Computes the next cycle date safely handling month lengths and leap years."""
    freq = (frequency or "monthly").lower()
    if freq == "daily":
        return current + timedelta(days=1)
    elif freq == "weekly":
        return current + timedelta(days=7)
    elif freq == "yearly":
        year = current.year + 1
        max_days = calendar.monthrange(year, current.month)[1]
        return date(year, current.month, min(current.day, max_days))
    else:  # default monthly
        year = current.year
        month = current.month + 1
        if month > 12:
            month = 1
            year += 1
        max_days = calendar.monthrange(year, month)[1]
        return date(year, month, min(current.day, max_days))


def _to_date(val) -> date:
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        try:
            return date.fromisoformat(val)
        except ValueError:
            pass
    return date.today()


def _rule_to_response(rule: dict) -> RecurringExpenseResponse:
    return RecurringExpenseResponse(
        id=str(rule.get("id")),
        user_id=str(rule.get("user_id")),
        description=rule.get("description", ""),
        amount=float(rule.get("amount", 0)),
        currency=rule.get("currency", "INR"),
        category=rule.get("category", "rent"),
        frequency=rule.get("frequency", "monthly"),
        start_date=_to_date(rule.get("start_date")),
        next_run_date=_to_date(rule.get("next_run_date")),
        last_run_date=_to_date(rule.get("last_run_date")) if rule.get("last_run_date") else None,
        is_active=bool(rule.get("is_active", True)),
        is_group=bool(rule.get("is_group", False)),
        group_id=rule.get("group_id"),
        paid_by=rule.get("paid_by"),
        notes=rule.get("notes"),
        created_at=rule.get("created_at") or datetime.utcnow(),
        updated_at=rule.get("updated_at") or datetime.utcnow(),
    )


@router.get("", response_model=List[RecurringExpenseResponse])
async def get_recurring_expenses(
    current_user: UserProfile = Depends(get_current_user),
):
    """List all recurring expense rules for the logged-in user."""
    supabase = get_supabase()
    if supabase:
        try:
            res = (
                supabase.table("recurring_expenses")
                .select("*")
                .eq("user_id", str(current_user.id))
                .order("created_at", desc=True)
                .execute()
            )
            if res.data is not None:
                return [_rule_to_response(r) for r in res.data]
        except Exception as e:
            print(f"Supabase recurring fetch notice: {e}")

    # Fallback local
    user_rules = [
        _rule_to_response(r)
        for r in _local_recurring_db.values()
        if str(r.get("user_id")) == str(current_user.id)
    ]
    return user_rules


@router.post("", response_model=RecurringExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_expense(
    data: CreateRecurringExpenseRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Create a new automated recurring expense rule."""
    rule_id = str(uuid.uuid4())
    start_d = data.start_date or date.today()
    next_d = data.next_run_date or start_d

    new_rule = {
        "id": rule_id,
        "user_id": str(current_user.id),
        "description": data.description.strip(),
        "amount": data.amount,
        "currency": (data.currency or "INR").upper(),
        "category": data.category.lower(),
        "frequency": data.frequency.lower(),
        "start_date": start_d.isoformat(),
        "next_run_date": next_d.isoformat(),
        "last_run_date": None,
        "is_active": data.is_active,
        "is_group": data.is_group,
        "group_id": data.group_id,
        "paid_by": data.paid_by,
        "notes": data.notes,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("recurring_expenses").insert(new_rule).execute()
            if res.data:
                return _rule_to_response(res.data[0])
        except Exception as e:
            print(f"Supabase recurring write notice: {e}")

    _local_recurring_db[rule_id] = new_rule
    return _rule_to_response(new_rule)


@router.put("/{rule_id}", response_model=RecurringExpenseResponse)
async def update_recurring_expense(
    rule_id: str,
    data: UpdateRecurringExpenseRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """Update or toggle pause/resume on a recurring expense rule."""
    supabase = get_supabase()
    update_data = {"updated_at": datetime.utcnow().isoformat()}

    if data.description is not None:
        update_data["description"] = data.description.strip()
    if data.amount is not None:
        update_data["amount"] = data.amount
    if data.currency is not None:
        update_data["currency"] = data.currency.upper()
    if data.category is not None:
        update_data["category"] = data.category.lower()
    if data.frequency is not None:
        update_data["frequency"] = data.frequency.lower()
    if data.next_run_date is not None:
        update_data["next_run_date"] = data.next_run_date.isoformat()
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    if data.notes is not None:
        update_data["notes"] = data.notes

    if supabase:
        try:
            res = (
                supabase.table("recurring_expenses")
                .update(update_data)
                .eq("id", rule_id)
                .eq("user_id", str(current_user.id))
                .execute()
            )
            if res.data:
                return _rule_to_response(res.data[0])
        except Exception as e:
            print(f"Supabase recurring update notice: {e}")

    if rule_id in _local_recurring_db:
        if str(_local_recurring_db[rule_id].get("user_id")) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to edit this rule")
        _local_recurring_db[rule_id].update(update_data)
        return _rule_to_response(_local_recurring_db[rule_id])

    raise HTTPException(status_code=404, detail="Recurring expense rule not found")


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_expense(
    rule_id: str,
    current_user: UserProfile = Depends(get_current_user),
):
    """Delete a recurring expense rule."""
    supabase = get_supabase()
    if supabase:
        try:
            supabase.table("recurring_expenses").delete().eq("id", rule_id).eq("user_id", str(current_user.id)).execute()
        except Exception as e:
            print(f"Supabase recurring delete notice: {e}")

    if rule_id in _local_recurring_db:
        if str(_local_recurring_db[rule_id].get("user_id")) == str(current_user.id):
            del _local_recurring_db[rule_id]

    return None


@router.post("/process-due", response_model=ProcessRecurringDueResponse)
async def process_due_recurring_expenses(
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Scans for active recurring expense rules where next_run_date <= today.
    Automatically logs each due bill as an actual expense and advances next_run_date to the next cycle.
    """
    today = date.today()
    supabase = get_supabase()
    rules = []

    if supabase:
        try:
            res = (
                supabase.table("recurring_expenses")
                .select("*")
                .eq("user_id", str(current_user.id))
                .eq("is_active", True)
                .lte("next_run_date", today.isoformat())
                .execute()
            )
            if res.data:
                rules = res.data
        except Exception as e:
            print(f"Supabase recurring due query notice: {e}")

    if not rules:
        # Check local DB
        rules = [
            r
            for r in _local_recurring_db.values()
            if str(r.get("user_id")) == str(current_user.id)
            and r.get("is_active", True)
            and _to_date(r.get("next_run_date")) <= today
        ]

    logged = []

    for rule in rules:
        try:
            desc = rule.get("description", "Recurring Bill")
            amt = float(rule.get("amount", 0))
            cat = rule.get("category", "rent")
            freq = rule.get("frequency", "monthly")
            due_date = _to_date(rule.get("next_run_date"))
            rule_notes = rule.get("notes") or ""
            auto_notes = f"[Auto-Recurring: {freq.capitalize()}] {rule_notes}".strip()

            exp_id = str(uuid.uuid4())
            new_expense = {
                "id": exp_id,
                "user_id": str(current_user.id),
                "description": desc,
                "amount": amt,
                "category": cat,
                "expense_date": due_date.isoformat(),
                "notes": auto_notes,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            # 1. Insert into personal_expenses
            if supabase:
                try:
                    supabase.table("personal_expenses").insert(new_expense).execute()
                except Exception as exp_err:
                    print(f"Supabase insert due expense notice: {exp_err}")
                    _local_personal_expenses_db[exp_id] = new_expense
            else:
                _local_personal_expenses_db[exp_id] = new_expense

            # 2. Advance next_run_date
            next_date = _calculate_next_date(due_date, freq)
            update_payload = {
                "next_run_date": next_date.isoformat(),
                "last_run_date": today.isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }

            rule_id = rule.get("id")
            if supabase:
                try:
                    supabase.table("recurring_expenses").update(update_payload).eq("id", rule_id).execute()
                except Exception as up_err:
                    print(f"Supabase update recurring rule notice: {up_err}")
            if rule_id in _local_recurring_db:
                _local_recurring_db[rule_id].update(update_payload)

            logged.append(desc)
        except Exception as process_err:
            print(f"Failed processing recurring rule {rule.get('id')}: {process_err}")

    msg = f"Processed {len(logged)} due recurring bill(s)" if logged else "All recurring bills are up to date."
    return ProcessRecurringDueResponse(
        processed_count=len(logged),
        logged_descriptions=logged,
        message=msg,
    )
