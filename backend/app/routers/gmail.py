# ============================================================
# GMAIL & UPI ROUTER — Sync, Parse, and Auto-Log Transactions
# ============================================================

import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from app.models.user import UserProfile
from app.middleware.auth import get_current_user
from app.database import get_supabase
from app.services.gmail_service import fetch_bank_emails
from app.services.ai_service import parse_batch_upi_transactions, parse_raw_text_transactions
from app.routers.personal_expenses import _local_personal_expenses_db

router = APIRouter(prefix="/api/gmail", tags=["Gmail & UPI Sync"])


class SyncGmailRequest(BaseModel):
    access_token: str = Field(..., description="Google OAuth access token with gmail.readonly scope")
    max_results: int = Field(default=15, ge=1, le=50)


class ParseTextRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Raw bank email text, e-statement, or SMS chain")


class TransactionItem(BaseModel):
    id: Optional[str] = None
    description: str
    amount: float
    category: str = "food"
    expense_date: str
    upi_ref_id: Optional[str] = None
    bank_name: str = "Bank"
    account_last4: Optional[str] = None
    raw_snippet: Optional[str] = None
    is_duplicate: bool = False


class ImportTransactionsRequest(BaseModel):
    transactions: List[TransactionItem]


def _check_duplicates(transactions: list, user_id: str) -> list:
    """
    Scans existing personal expenses to mark whether each transaction has already been logged.
    Uses UPI Ref ID or exact (date + amount + description) match.
    """
    supabase = get_supabase()
    existing_expenses = []

    if supabase:
        try:
            res = (
                supabase.table("personal_expenses")
                .select("description, amount, expense_date, notes")
                .eq("user_id", str(user_id))
                .order("expense_date", desc=True)
                .limit(100)
                .execute()
            )
            if res.data:
                existing_expenses = res.data
        except Exception as e:
            print(f"Supabase dup check notice: {e}")

    if not existing_expenses:
        existing_expenses = [
            e for e in _local_personal_expenses_db.values()
            if str(e.get("user_id")) == str(user_id)
        ]

    for item in transactions:
        item["id"] = item.get("id") or str(uuid.uuid4())
        ref = item.get("upi_ref_id")
        amt = float(item.get("amount", 0))
        d_str = str(item.get("expense_date", ""))
        desc_lower = item.get("description", "").lower()

        is_dup = False
        for ex in existing_expenses:
            ex_notes = str(ex.get("notes") or "")
            ex_amt = float(ex.get("amount", 0))
            ex_date = str(ex.get("expense_date") or "")
            ex_desc = str(ex.get("description") or "").lower()

            # 1. Match by UPI Reference ID in notes
            if ref and ref in ex_notes:
                is_dup = True
                break

            # 2. Match by exact date, amount and similar description
            if ex_date == d_str and abs(ex_amt - amt) < 0.01:
                if desc_lower in ex_desc or ex_desc in desc_lower:
                    is_dup = True
                    break

        item["is_duplicate"] = is_dup

    return transactions


@router.post("/sync")
async def sync_gmail_bank_alerts(
    data: SyncGmailRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Fetches latest bank and UPI emails from Gmail, parses them with Gemini AI,
    and runs duplicate detection against logged expenses.
    """
    try:
        raw_emails = fetch_bank_emails(data.access_token, max_results=data.max_results)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed connecting to Gmail: {str(e)}")

    if not raw_emails:
        return {
            "count": 0,
            "transactions": [],
            "message": "No new bank or UPI alert emails found in your inbox."
        }

    # Parse with Gemini 2.5 Flash
    parsed_transactions = parse_batch_upi_transactions(raw_emails)

    # Check duplicates
    checked_transactions = _check_duplicates(parsed_transactions, current_user.id)

    new_count = sum(1 for t in checked_transactions if not t["is_duplicate"])

    return {
        "count": len(checked_transactions),
        "new_count": new_count,
        "duplicate_count": len(checked_transactions) - new_count,
        "transactions": checked_transactions,
        "message": f"Successfully detected {len(checked_transactions)} transaction(s) ({new_count} ready to import)."
    }


@router.post("/parse-text-batch")
async def parse_text_batch(
    data: ParseTextRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Parses pasted bank alert text, SMS chains, or e-statement lines with Gemini AI
    and checks for duplicate expenses.
    """
    parsed = parse_raw_text_transactions(data.text)
    if not parsed:
        return {
            "count": 0,
            "transactions": [],
            "message": "Could not identify any valid debit expenses in the provided text."
        }

    checked_transactions = _check_duplicates(parsed, current_user.id)
    new_count = sum(1 for t in checked_transactions if not t["is_duplicate"])

    return {
        "count": len(checked_transactions),
        "new_count": new_count,
        "duplicate_count": len(checked_transactions) - new_count,
        "transactions": checked_transactions,
        "message": f"Extracted {len(checked_transactions)} transaction(s)."
    }


@router.post("/import-transactions")
async def import_transactions(
    data: ImportTransactionsRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Batch imports selected verified transactions directly into Personal Expenses.
    """
    if not data.transactions:
        raise HTTPException(status_code=400, detail="No transactions selected for import")

    supabase = get_supabase()
    imported = []

    for item in data.transactions:
        exp_id = str(uuid.uuid4())
        ref_tag = f"[UPI Ref: {item.upi_ref_id}]" if item.upi_ref_id else ""
        bank_tag = f"{item.bank_name} Alert" if item.bank_name else "Bank Alert"
        combined_notes = f"{ref_tag} {bank_tag}".strip()

        new_expense = {
            "id": exp_id,
            "user_id": str(current_user.id),
            "description": item.description.strip(),
            "amount": float(item.amount),
            "category": item.category.lower(),
            "expense_date": item.expense_date,
            "notes": combined_notes,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        if supabase:
            try:
                supabase.table("personal_expenses").insert(new_expense).execute()
                imported.append(item.description)
            except Exception as e:
                print(f"Supabase import transaction error: {e}")
                _local_personal_expenses_db[exp_id] = new_expense
                imported.append(item.description)
        else:
            _local_personal_expenses_db[exp_id] = new_expense
            imported.append(item.description)

    return {
        "imported_count": len(imported),
        "imported_merchants": imported,
        "message": f"Successfully imported {len(imported)} transaction(s) into Divvy!"
    }
