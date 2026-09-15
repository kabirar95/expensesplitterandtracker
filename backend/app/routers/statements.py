# ============================================================
# STATEMENTS ROUTER — Bank Statement Bulk Importer (PDF & CSV)
# ============================================================

import io
import csv
import uuid
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status, Depends
from pydantic import BaseModel

from app.models.user import UserProfile
from app.middleware.auth import get_current_user
from app.database import get_supabase
from app.services.ai_service import parse_bank_statement_transactions
from app.routers.personal_expenses import _local_personal_expenses_db

try:
    import pypdf
except ImportError:
    pypdf = None

router = APIRouter(prefix="/api/statements", tags=["Bank Statements"])


class ImportTransactionItem(BaseModel):
    date: str
    description: str
    amount: float
    category: str = "other"
    notes: Optional[str] = None


class BatchImportRequest(BaseModel):
    transactions: List[ImportTransactionItem]


def _clean_amount(val: str) -> float:
    """Helper to sanitize currency strings like '1,250.50' or '₹ 300' into a float."""
    if not val:
        return 0.0
    cleaned = str(val).replace("₹", "").replace(",", "").replace("Rs.", "").replace("INR", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _parse_csv_statement(content_str: str) -> list:
    """
    Parses standard bank CSV exports (HDFC, ICICI, SBI, Axis, Kotak, etc.).
    """
    lines = [line.strip() for line in content_str.splitlines() if line.strip()]
    if not lines:
        return []

    # Find the header row (contains keywords like date, narration/description, debit/withdrawal)
    header_idx = -1
    for idx, line in enumerate(lines[:20]):
        low = line.lower()
        if ("date" in low) and ("narration" in low or "description" in low or "particulars" in low or "remarks" in low or "details" in low):
            header_idx = idx
            break
        if ("date" in low) and ("debit" in low or "withdrawal" in low or "amount" in low):
            header_idx = idx
            break

    if header_idx == -1:
        # Fallback to general AI parsing if headers are irregular
        return []

    csv_reader = csv.reader(lines[header_idx:])
    try:
        headers = [h.strip().lower() for h in next(csv_reader)]
    except StopIteration:
        return []

    # Find column indexes
    date_col = next((i for i, h in enumerate(headers) if "date" in h), None)
    desc_col = next((i for i, h in enumerate(headers) if any(k in h for k in ["narration", "description", "particular", "remark", "detail"])), None)
    debit_col = next((i for i, h in enumerate(headers) if any(k in h for k in ["debit", "withdrawal", "dr"])), None)
    credit_col = next((i for i, h in enumerate(headers) if any(k in h for k in ["credit", "deposit", "cr"])), None)
    amount_col = next((i for i, h in enumerate(headers) if "amount" in h and i not in (debit_col, credit_col)), None)
    ref_col = next((i for i, h in enumerate(headers) if any(k in h for k in ["ref", "chq", "utr", "txn id"])), None)

    transactions = []
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    for row in csv_reader:
        if not row or len(row) <= max(filter(lambda x: x is not None, [date_col, desc_col])):
            continue

        raw_date = row[date_col].strip() if date_col is not None and date_col < len(row) else today_str
        raw_desc = row[desc_col].strip() if desc_col is not None and desc_col < len(row) else "Bank Transaction"

        debit_amt = _clean_amount(row[debit_col]) if debit_col is not None and debit_col < len(row) else 0.0
        credit_amt = _clean_amount(row[credit_col]) if credit_col is not None and credit_col < len(row) else 0.0

        amt = 0.0
        txn_type = "debit"
        if debit_amt > 0:
            amt = debit_amt
            txn_type = "debit"
        elif credit_amt > 0:
            amt = credit_amt
            txn_type = "credit"
        elif amount_col is not None and amount_col < len(row):
            amt = _clean_amount(row[amount_col])
            txn_type = "debit"

        if amt <= 0:
            continue

        ref_no = row[ref_col].strip() if ref_col is not None and ref_col < len(row) else None

        # Clean date format (DD/MM/YYYY or DD-MM-YYYY -> YYYY-MM-DD)
        parsed_date = today_str
        for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%m-%y"):
            try:
                parsed_date = datetime.strptime(raw_date, fmt).strftime("%Y-%m-%d")
                break
            except ValueError:
                pass

        transactions.append({
            "date": parsed_date,
            "description": raw_desc[:80],
            "raw_narration": raw_desc,
            "amount": round(amt, 2),
            "type": txn_type,
            "category": "other",
            "reference_no": ref_no,
        })

    return transactions


@router.post("/parse")
async def parse_statement(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Parses an uploaded bank statement (PDF or CSV) with optional password decryption.
    Returns extracted transactions categorized with duplicate detection flags.
    """
    filename = file.filename.lower()
    contents = await file.read()

    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 15 MB limit."
        )

    transactions = []

    # ── 1. Handle CSV files ──
    if filename.endswith(".csv"):
        try:
            content_str = contents.decode("utf-8", errors="ignore")
            transactions = _parse_csv_statement(content_str)
            if not transactions:
                # If rule-based CSV parse found nothing, pass text to AI
                transactions = parse_bank_statement_transactions(content_str[:12000])
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read CSV file: {str(e)}"
            )

    # ── 2. Handle PDF files ──
    elif filename.endswith(".pdf"):
        if pypdf is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF processing library is not installed."
            )
        try:
            pdf_stream = io.BytesIO(contents)
            reader = pypdf.PdfReader(pdf_stream)

            # Handle password protection
            if reader.is_encrypted:
                if not password:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This PDF bank statement is password-protected. Please provide the document password."
                    )
                decrypt_success = reader.decrypt(password.strip())
                if decrypt_success == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Incorrect password for protected bank statement. Please check and try again."
                    )

            # Extract text from pages (up to 10 pages)
            extracted_text = []
            for idx, page in enumerate(reader.pages[:10]):
                txt = page.extract_text()
                if txt:
                    extracted_text.append(txt)

            full_text = "\n".join(extracted_text).strip()
            if len(full_text) < 20:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Could not extract readable text from this PDF. Please ensure it is a digital e-statement and not a scanned picture."
                )

            transactions = parse_bank_statement_transactions(full_text)

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error reading PDF statement: {str(e)}"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported statement format. Please upload a PDF or CSV file."
        )

    # ── 3. Duplicate Detection against existing personal expenses ──
    existing_lookup = set()
    supabase = get_supabase()
    if supabase:
        try:
            res = (
                supabase.table("personal_expenses")
                .select("expense_date, amount")
                .eq("user_id", str(current_user.id))
                .execute()
            )
            if res.data:
                for row in res.data:
                    existing_lookup.add((str(row.get("expense_date")), round(float(row.get("amount", 0)), 2)))
        except Exception as e:
            print(f"Supabase duplicate check notice: {e}")

    for row in _local_personal_expenses_db.values():
        if row.get("user_id") == str(current_user.id):
            existing_lookup.add((str(row.get("expense_date")), round(float(row.get("amount", 0)), 2)))

    # Flag duplicates
    for txn in transactions:
        txn_key = (txn.get("date"), round(float(txn.get("amount", 0)), 2))
        txn["is_duplicate"] = txn_key in existing_lookup

    return {
        "success": True,
        "filename": file.filename,
        "total_count": len(transactions),
        "transactions": transactions,
    }


@router.post("/import")
async def import_statement_transactions(
    payload: BatchImportRequest,
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Batch-inserts approved transactions into the user's personal expenses tracker.
    """
    if not payload.transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transactions provided for import."
        )

    inserted_items = []
    supabase = get_supabase()

    for item in payload.transactions:
        exp_id = str(uuid.uuid4())
        record = {
            "id": exp_id,
            "user_id": str(current_user.id),
            "description": item.description.strip(),
            "amount": float(item.amount),
            "category": item.category.lower(),
            "expense_date": item.date,
            "notes": item.notes or "Imported via Bank Statement",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        if supabase:
            try:
                res = supabase.table("personal_expenses").insert(record).execute()
                if res.data:
                    inserted_items.append(res.data[0])
                    continue
            except Exception as e:
                print(f"Supabase batch write notice: {e}")

        _local_personal_expenses_db[exp_id] = record
        inserted_items.append(record)

    return {
        "success": True,
        "imported_count": len(inserted_items),
        "transactions": inserted_items,
    }
