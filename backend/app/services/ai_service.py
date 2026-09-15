# ============================================================
# DIVVY AI SERVICE — Gemini-Powered Financial Intelligence
# ============================================================

import json
import re
from datetime import datetime
from google import genai
from google.genai import types
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
    Calls Google Gemini AI to generate intelligent, context-aware financial guidance.
    Supports multi-turn conversation history for a true GPT-like experience.
    """
    if not settings.gemini_api_key:
        return "⚠️ Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file."

    try:
        client = genai.Client(api_key=settings.gemini_api_key)

        # Build financial context block injected into the system prompt
        context_block = build_financial_context_prompt(
            user_name=user_name,
            selected_month=selected_month,
            monthly_spent=monthly_spent,
            yearly_spent=yearly_spent,
            overall_budget=overall_budget,
            category_budgets=category_budgets,
            recent_personal_expenses=recent_personal_expenses,
            group_balances=group_balances
        )

        full_system_prompt = f"{DIVVY_AI_SYSTEM_PROMPT}\n\n{context_block}"

        # Build conversation history (multi-turn memory)
        contents = []
        if chat_history:
            for msg in chat_history:
                role = "user" if msg.get("sender") == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=msg.get("text", ""))]
                    )
                )

        # Add the current user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part(text=user_message)]
            )
        )

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=full_system_prompt,
                temperature=0.7,
                max_output_tokens=1024,
            )
        )

        if response and response.text:
            return response.text.strip()
        else:
            return "I wasn't able to generate a response. Please try again."

    except Exception as e:
        print(f"⚠️ Gemini API Error: {e}")
        return f"⚠️ AI Error: {str(e)}"


def parse_expense_text(text: str) -> dict:
    """
    Parses unstructured text (such as bank debit SMS, UPI alert, or casual expense note)
    into structured expense fields using Gemini AI with JSON output.
    """
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    # Fast heuristic fallback in case AI is offline or encounters an error
    fallback_res = _regex_parse_expense(text, today_str)

    if not settings.gemini_api_key:
        return fallback_res

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        prompt = f"""You are an Indian banking and transaction extraction engine.
Analyze this user text, which may be a Bank SMS, UPI notification, or casual expense note:
"{text}"

Extract the following JSON strictly conforming to this schema:
{{
  "description": "Clean merchant, store, or service name (e.g. Swiggy, Uber, Electricity, Grocery Store)",
  "amount": 0.0,
  "category": "strictly one of: food, rent, shopping, travel, entertainment, health, other",
  "expense_date": "YYYY-MM-DD (use today's date {today_str} if not specified in text)",
  "payment_method": "UPI | Card | NetBanking | Cash",
  "notes": "Transaction UTR, reference number, or brief context if available"
}}

Respond ONLY with valid JSON."""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
        )

        if response and response.text:
            cleaned = response.text.strip()
            parsed = json.loads(cleaned)
            # Ensure required fields and category validity
            valid_categories = {"food", "rent", "shopping", "travel", "entertainment", "health", "other"}
            cat = str(parsed.get("category", "other")).lower()
            if cat not in valid_categories:
                cat = _keyword_categorize(str(parsed.get("description", "")))

            return {
                "description": str(parsed.get("description", fallback_res["description"])).strip() or "Expense",
                "amount": float(parsed.get("amount", fallback_res["amount"]) or 0.0),
                "category": cat,
                "expense_date": str(parsed.get("expense_date", today_str)),
                "payment_method": str(parsed.get("payment_method", "UPI")),
                "notes": parsed.get("notes") or "",
                "confidence": 0.95
            }
    except Exception as e:
        print(f"⚠️ Gemini parse_expense error: {e}")

    return fallback_res


def auto_categorize_text(description: str, amount: float = None) -> dict:
    """
    Classifies an expense description into one of Divvy's standard categories.
    """
    heuristic_cat = _keyword_categorize(description)

    if not settings.gemini_api_key:
        return {"category": heuristic_cat, "confidence": 0.8, "rationale": "Rule-based match"}

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        prompt = f"""Given the expense description "{description}" with amount ₹{amount or 0}:
Classify it into strictly ONE of these categories:
- food (dining, restaurants, snacks, groceries, delivery)
- rent (rent, maintenance, home bills, utilities)
- shopping (clothing, electronics, retail, amazon)
- travel (cabs, fuel, flights, metro, bus, parking)
- entertainment (movies, games, events, subscriptions)
- health (pharmacy, doctor, gym, fitness)
- other (misc items)

Respond ONLY with valid JSON:
{{
  "category": "food | rent | shopping | travel | entertainment | health | other",
  "rationale": "short 5-word explanation"
}}"""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        if response and response.text:
            parsed = json.loads(response.text.strip())
            cat = parsed.get("category", heuristic_cat).lower()
            valid_categories = {"food", "rent", "shopping", "travel", "entertainment", "health", "other"}
            if cat in valid_categories:
                return {
                    "category": cat,
                    "confidence": 0.95,
                    "rationale": parsed.get("rationale", "AI classified")
                }
    except Exception as e:
        print(f"⚠️ Gemini auto_categorize error: {e}")

    return {"category": heuristic_cat, "confidence": 0.8, "rationale": "Keyword pattern"}


def generate_spending_prediction(
    selected_month: str,
    monthly_spent: float,
    overall_budget: float,
    category_budgets: list = None,
    recent_personal_expenses: list = None
) -> dict:
    """
    Computes mathematical burn rate projections and augments them with Gemini AI insights.
    """
    today = datetime.utcnow()
    day_of_month = max(1, today.day)
    # Estimate days in month (standard 30-day projection)
    days_in_month = 30
    remaining_days = max(1, days_in_month - day_of_month)

    daily_burn_rate = monthly_spent / day_of_month
    predicted_total = round(monthly_spent + (daily_burn_rate * remaining_days), 2)
    budget = overall_budget or 0.0
    projected_delta = round(budget - predicted_total, 2)

    risk_level = "low"
    if budget > 0:
        if predicted_total > budget * 1.15:
            risk_level = "high"
        elif predicted_total > budget * 0.95:
            risk_level = "medium"

    default_insights = [
        f"You are currently spending an average of ₹{daily_burn_rate:.2f} per day.",
        f"At your current pace, your projected month-end total will be ₹{predicted_total:,.2f}.",
    ]
    if budget > 0:
        if projected_delta < 0:
            default_insights.append(f"⚠️ Warning: You are on track to exceed your budget by ₹{abs(projected_delta):,.2f}.")
        else:
            default_insights.append(f"✅ On track: You have an estimated buffer of ₹{projected_delta:,.2f} before hitting your budget.")

    default_tips = [
        "Review your discretionary spending categories (Food & Dining and Shopping) to stay under budget.",
        "Consider putting 10% of any remaining budget buffer into your emergency savings."
    ]

    if not settings.gemini_api_key:
        return {
            "predicted_monthly_total": predicted_total,
            "projected_savings_or_deficit": projected_delta,
            "risk_level": risk_level,
            "insights": default_insights,
            "tips": default_tips
        }

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        prompt = f"""Current Financial Snapshot for {selected_month or 'this month'}:
- Day of month: {day_of_month} of {days_in_month}
- Amount spent so far: ₹{monthly_spent:,.2f}
- Overall monthly target budget: ₹{budget:,.2f}
- Projected month-end spending: ₹{predicted_total:,.2f}
- Projected deficit/surplus: ₹{projected_delta:,.2f}

Provide 2-3 concise financial insights and 2 actionable tips as valid JSON:
{{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "tips": ["actionable tip 1", "actionable tip 2"]
}}"""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json"
            )
        )

        if response and response.text:
            data = json.loads(response.text.strip())
            return {
                "predicted_monthly_total": predicted_total,
                "projected_savings_or_deficit": projected_delta,
                "risk_level": risk_level,
                "insights": data.get("insights", default_insights),
                "tips": data.get("tips", default_tips)
            }
    except Exception as e:
        print(f"⚠️ Gemini prediction error: {e}")

    return {
        "predicted_monthly_total": predicted_total,
        "projected_savings_or_deficit": projected_delta,
        "risk_level": risk_level,
        "insights": default_insights,
        "tips": default_tips
    }


def _keyword_categorize(text: str) -> str:
    """Fast keyword matching for Indian merchants and common categories."""
    t = text.lower()
    if any(k in t for k in ["swiggy", "zomato", "restaurant", "cafe", "coffee", "food", "burger", "pizza", "biryani", "lunch", "dinner", "mcdonald", "starbucks"]):
        return "food"
    if any(k in t for k in ["uber", "ola", "metro", "auto", "petrol", "diesel", "fuel", "rapido", "flight", "irctc", "train", "cab", "toll"]):
        return "travel"
    if any(k in t for k in ["rent", "maintenance", "electricity", "bescom", "water", "wifi", "broadband", "jio", "airtel", "utility", "cylinder", "gas"]):
        return "rent"
    if any(k in t for k in ["amazon", "flipkart", "myntra", "zara", "h&m", "shopping", "store", "supermarket", "mart", "blinkit", "zepto", "instamart"]):
        return "shopping"
    if any(k in t for k in ["cinema", "movie", "pvr", "inox", "bookmyshow", "netflix", "spotify", "prime", "hotstar", "game", "pub", "bar"]):
        return "entertainment"
    if any(k in t for k in ["pharmacy", "apollo", "medplus", "hospital", "doctor", "clinic", "lab", "gym", "cult", "fitness"]):
        return "health"
    return "other"


def _regex_parse_expense(text: str, today_str: str) -> dict:
    """Regex fallback for parsing Indian bank SMS formats."""
    # Find amount: ₹ 500, Rs. 500, Rs 500.00, INR 500, debited by 500
    amount = 0.0
    amt_match = re.search(r'(?:rs\.?|inr|₹|debited by\s*(?:rs\.?)?)\s*([\d,]+(?:\.\d{1,2})?)', text, re.IGNORECASE)
    if amt_match:
        try:
            amount = float(amt_match.group(1).replace(',', ''))
        except ValueError:
            amount = 0.0

    # Find merchant
    merchant = "Expense"
    to_match = re.search(r'(?:to|at|vpa|info\/)\s*([A-Za-z0-9\s\.\@\-]{3,25})', text, re.IGNORECASE)
    if to_match:
        merchant = to_match.group(1).strip()
    elif "swiggy" in text.lower():
        merchant = "Swiggy"
    elif "zomato" in text.lower():
        merchant = "Zomato"
    elif "uber" in text.lower():
        merchant = "Uber"

    category = _keyword_categorize(text)

    return {
        "description": merchant,
        "amount": amount,
        "category": category,
        "expense_date": today_str,
        "payment_method": "UPI" if "upi" in text.lower() else "Card",
        "notes": "Parsed via rule engine",
        "confidence": 0.75
    }


def parse_batch_upi_transactions(email_items: list) -> list:
    """
    Parses a batch of Indian banking and UPI alert emails using Gemini 2.5 Flash.
    Extracts merchant, amount, category, date, bank, and UPI reference IDs.
    Filters out credit/salary deposits unless requested.
    """
    if not email_items:
        return []

    # If Gemini API key is missing, use rule-based fallback
    if not settings.gemini_api_key:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        results = []
        for item in email_items:
            text = f"{item.get('subject', '')} {item.get('body_text', '') or item.get('snippet', '')}"
            parsed = _regex_parse_expense(text, today_str)
            parsed["bank_name"] = "Bank Alert"
            parsed["upi_ref_id"] = item.get("message_id")
            parsed["message_id"] = item.get("message_id")
            parsed["raw_snippet"] = item.get("snippet", "")[:120]
            if parsed["amount"] > 0:
                results.append(parsed)
        return results

    try:
        client = genai.Client(api_key=settings.gemini_api_key)

        # Format emails into numbered items for Gemini
        emails_payload = []
        for idx, item in enumerate(email_items):
            emails_payload.append(
                f"[EMAIL {idx + 1}]\n"
                f"ID: {item.get('message_id', '')}\n"
                f"Subject: {item.get('subject', '')}\n"
                f"Sender: {item.get('sender', '')}\n"
                f"Date Header: {item.get('email_date', '')}\n"
                f"Content: {item.get('body_text', '')[:600]}\n"
            )

        combined_text = "\n---\n".join(emails_payload)
        today_iso = datetime.utcnow().strftime("%Y-%m-%d")

        prompt = f"""You are an expert Indian Banking & UPI Transaction Extraction Engine for a personal finance app.
Current Date: {today_iso}

Analyze the following bank alert emails from Indian banks (HDFC, SBI, ICICI, Axis, Kotak, Google Pay, PhonePe, Paytm, Cred, etc.).
Extract ONLY real debit/spending expenses. Skip OTP notices, marketing emails, and credit deposits.

Input Emails:
{combined_text}

For every valid spending transaction, extract:
- "description": Clean, human-readable merchant or recipient name (e.g., "Swiggy", "Zomato", "Uber", "Blinkit", "Starbucks", "Zepto", "Rahul", "D-Mart"). Remove generic prefixes like 'VPA', 'UPI/', 'INFO/'.
- "amount": numeric float spent (positive number)
- "category": exactly one of ["food", "travel", "rent", "shopping", "entertainment", "health", "other"]
- "expense_date": date of transaction in YYYY-MM-DD format (use email date or fallback to {today_iso})
- "upi_ref_id": UPI Reference / RRN number or Transaction ID if present (e.g., "4259182910" or "UPI/234567"), or null
- "bank_name": detected bank or payment app (e.g., "HDFC Bank", "SBI", "ICICI Bank", "Google Pay", "PhonePe", "Paytm")
- "account_last4": last 4 digits of account or card if mentioned, else null
- "raw_snippet": brief 1-line snippet of the transaction text
- "message_id": the original ID from [EMAIL X] if present

Return ONLY a JSON array of transaction objects:
[
  {{
    "description": "Swiggy",
    "amount": 420.0,
    "category": "food",
    "expense_date": "2026-09-14",
    "upi_ref_id": "4259182910",
    "bank_name": "HDFC Bank",
    "account_last4": "8921",
    "raw_snippet": "INR 420.00 debited from A/c XX8921 to SWIGGY",
    "message_id": "18f9e..."
  }}
]"""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json"
            )
        )

        if response and response.text:
            parsed_list = json.loads(response.text.strip())
            if isinstance(parsed_list, list):
                # Ensure valid fields
                valid_items = []
                for t in parsed_list:
                    if isinstance(t, dict) and float(t.get("amount", 0)) > 0:
                        valid_items.append({
                            "description": t.get("description", "Expense").strip(),
                            "amount": round(float(t.get("amount", 0)), 2),
                            "category": t.get("category", "other").lower(),
                            "expense_date": t.get("expense_date") or today_iso,
                            "upi_ref_id": str(t.get("upi_ref_id") or "").strip() or None,
                            "bank_name": t.get("bank_name", "Bank"),
                            "account_last4": str(t.get("account_last4") or "").strip() or None,
                            "raw_snippet": t.get("raw_snippet", "")[:160],
                            "message_id": t.get("message_id"),
                        })
                return valid_items

    except Exception as e:
        print(f"⚠️ Gemini batch UPI parsing error: {e}")

    # Fallback to regex
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    fallback_items = []
    for item in email_items:
        text = f"{item.get('subject', '')} {item.get('body_text', '')}"
        parsed = _regex_parse_expense(text, today_str)
        if parsed["amount"] > 0:
            fallback_items.append({
                "description": parsed["description"],
                "amount": parsed["amount"],
                "category": parsed["category"],
                "expense_date": parsed["expense_date"],
                "upi_ref_id": item.get("message_id"),
                "bank_name": "Bank Alert",
                "account_last4": None,
                "raw_snippet": item.get("snippet", "")[:120],
                "message_id": item.get("message_id"),
            })
    return fallback_items


def parse_raw_text_transactions(raw_text: str) -> list:
    """
    Parses pasted bank alert text, SMS chains, or statement lines using Gemini.
    """
    if not raw_text or not raw_text.strip():
        return []

    # Wrap as single virtual email item
    item = {
        "message_id": "pasted_text",
        "subject": "Pasted Bank Statement",
        "sender": "Manual Input",
        "email_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "body_text": raw_text.strip(),
        "snippet": raw_text.strip()[:140],
    }
    return parse_batch_upi_transactions([item])


def parse_receipt_image(file_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Parses a dining / grocery / retail receipt image using Google Gemini Vision.
    Extracts line items, subtotal, taxes (CGST/SGST/VAT), service charge, discount, and grand total.
    """
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    fallback = {
        "merchant_name": "Receipt Expense",
        "receipt_date": today_str,
        "items": [
            {
                "id": "item-1",
                "name": "Dining / Bill Items",
                "quantity": 1,
                "price": 0.0,
            }
        ],
        "subtotal": 0.0,
        "tax": 0.0,
        "service_charge": 0.0,
        "discount": 0.0,
        "grand_total": 0.0,
        "currency": "INR",
        "confidence": 0.5,
    }

    if not settings.gemini_api_key:
        return fallback

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        image_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)

        prompt = f"""You are an expert restaurant dining and shopping bill OCR extraction engine.
Carefully examine this receipt image and extract the itemized details into strictly valid JSON.

Schema:
{{
  "merchant_name": "Restaurant or merchant name (e.g. Social, Toit, Burger King)",
  "receipt_date": "YYYY-MM-DD (format as ISO date, or use {today_str} if absent/ambiguous)",
  "items": [
    {{
      "id": "item-1",
      "name": "Detailed item description or dish name",
      "quantity": 1,
      "price": 250.00
    }}
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "service_charge": 0.00,
  "discount": 0.00,
  "grand_total": 0.00,
  "currency": "INR"
}}

Rules:
1. "items": Include each distinct food/beverage or item with its total price for that line.
2. "tax": Sum of all taxes (CGST, SGST, IGST, VAT).
3. "service_charge": Restaurant service charge, packaging fee, or delivery fee if any.
4. "discount": Any round-off or promotional discount (positive number).
5. "grand_total": The final total amount payable on the receipt.
6. If items cannot be itemized individually, create a single item representing the total bill.
7. Return ONLY valid JSON, no markdown codeblocks or extra text.
"""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
        )

        if response and response.text:
            cleaned = response.text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            parsed = json.loads(cleaned)

            items = []
            for idx, itm in enumerate(parsed.get("items", [])):
                items.append({
                    "id": str(itm.get("id") or f"item-{idx+1}"),
                    "name": str(itm.get("name", f"Item {idx+1}")).strip(),
                    "quantity": float(itm.get("quantity", 1) or 1),
                    "price": round(float(itm.get("price", 0) or 0), 2),
                })

            subtotal = float(parsed.get("subtotal", 0) or 0)
            if not subtotal and items:
                subtotal = sum(i["price"] for i in items)

            grand_total = float(parsed.get("grand_total", 0) or 0)
            tax = float(parsed.get("tax", 0) or 0)
            service_charge = float(parsed.get("service_charge", 0) or 0)
            discount = float(parsed.get("discount", 0) or 0)

            if grand_total == 0 and subtotal > 0:
                grand_total = round(subtotal + tax + service_charge - discount, 2)

            return {
                "merchant_name": str(parsed.get("merchant_name", "Restaurant Bill")).strip(),
                "receipt_date": str(parsed.get("receipt_date", today_str)),
                "items": items if items else fallback["items"],
                "subtotal": round(subtotal, 2),
                "tax": round(tax, 2),
                "service_charge": round(service_charge, 2),
                "discount": round(discount, 2),
                "grand_total": round(grand_total, 2),
                "currency": str(parsed.get("currency", "INR")).upper(),
                "confidence": 0.95,
            }
    except Exception as e:
        print(f"⚠️ Gemini receipt OCR error: {e}")

    return fallback


def parse_bank_statement_transactions(statement_text: str) -> list:
    """
    Parses extracted bank statement text (PDF or CSV) into structured transactions using Gemini AI.
    """
    if not statement_text or not statement_text.strip():
        return []

    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    truncated_text = statement_text[:12000].strip()

    if not settings.gemini_api_key:
        return []

    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        prompt = f"""You are an Indian bank statement extraction engine (handling HDFC, ICICI, SBI, Axis, Kotak, etc.).
Extract all financial transactions from this statement excerpt.

Statement Text:
\"\"\"
{truncated_text}
\"\"\"

Return strictly valid JSON conforming to this schema:
[
  {{
    "date": "YYYY-MM-DD",
    "description": "Clean merchant or description (e.g. Swiggy, Uber, Zomato, Reliance Trends, Electricity Bill, Salary, Transfer to Rahul)",
    "raw_narration": "Original transaction narration string from statement",
    "amount": 250.00,
    "type": "debit" | "credit",
    "category": "food | travel | shopping | rent | entertainment | health | income | other",
    "reference_no": "UTR or Ref number if found, otherwise null"
  }}
]

Rules:
1. Debit = money spent or withdrawn (expenses).
2. Credit = money deposited or received (salary, refunds, transfers in).
3. "description" MUST BE human-friendly and concise. Strip noisy bank codes (e.g. "UPI/4234567890/SWIGGY/BAN/YESB" -> "Swiggy").
4. "category": Strictly one of: food, travel, shopping, rent, entertainment, health, income, other.
5. "date": ISO format YYYY-MM-DD. If year is missing, assume current year based on context.
6. Return ONLY valid JSON array.
"""

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                response_mime_type="application/json",
            )
        )

        if response and response.text:
            cleaned = response.text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            parsed = json.loads(cleaned)

            valid_txs = []
            valid_cats = {"food", "travel", "shopping", "rent", "entertainment", "health", "income", "other"}
            for t in parsed:
                amt = float(t.get("amount", 0) or 0)
                if amt <= 0:
                    continue
                cat = str(t.get("category", "other")).lower()
                if cat not in valid_cats:
                    cat = _keyword_categorize(str(t.get("description", "")))

                valid_txs.append({
                    "date": str(t.get("date", today_str)),
                    "description": str(t.get("description", "Bank Transaction")).strip() or "Transaction",
                    "raw_narration": str(t.get("raw_narration", "")).strip(),
                    "amount": round(amt, 2),
                    "type": "credit" if str(t.get("type", "debit")).lower() == "credit" else "debit",
                    "category": cat,
                    "reference_no": str(t.get("reference_no") or "").strip() or None,
                })
            return valid_txs

    except Exception as e:
        print(f"⚠️ Gemini statement parse error: {e}")

    return []

