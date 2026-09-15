# ============================================================
# GMAIL SERVICE — Fetch and Decode Bank & UPI Email Alerts
# ============================================================

import base64
import json
import re
import urllib.request
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any, Optional

GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"

# Query string specifically targeting Indian bank & UPI debit alert emails
BANK_EMAIL_QUERY = (
    'from:(hdfcbank OR icicibank OR sbi OR axisbank OR paytm OR phonepe OR googlepay OR '
    'kotak OR cred OR idfc OR indusind OR canarabank OR pnb OR rbl) '
    '(debited OR "UPI" OR "spent" OR "transferred" OR "paid")'
)


def _decode_base64_urlsafe(data_str: str) -> str:
    """Decodes base64url encoded email data into UTF-8 text."""
    try:
        # Replace url-safe chars and pad
        padded = data_str.replace('-', '+').replace('_', '/')
        padded += '=' * ((4 - len(padded) % 4) % 4)
        return base64.b64decode(padded).decode('utf-8', errors='ignore')
    except Exception:
        return ""


def _strip_html(html_text: str) -> str:
    """Removes HTML tags and excess whitespace to extract readable email text."""
    # Replace <br> and <p> with newlines
    clean = re.sub(r'<(?:br|p|div)[^>]*>', '\n', html_text, flags=re.IGNORECASE)
    # Remove all other tags
    clean = re.sub(r'<[^>]+>', ' ', clean)
    # Clean entity codes
    clean = clean.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'")
    # Collapse spaces
    clean = re.sub(r'[ \t]+', ' ', clean)
    clean = re.sub(r'\n\s*\n', '\n', clean)
    return clean.strip()


def _extract_body_text(payload: dict) -> str:
    """Recursively walks Gmail message payload to extract plain text or stripped HTML."""
    if not payload:
        return ""

    mime_type = payload.get("mimeType", "")
    body_data = payload.get("body", {}).get("data", "")

    if body_data:
        decoded = _decode_base64_urlsafe(body_data)
        if "text/html" in mime_type:
            return _strip_html(decoded)
        return decoded

    parts = payload.get("parts", [])
    text_content = []

    for part in parts:
        part_mime = part.get("mimeType", "")
        part_data = part.get("body", {}).get("data", "")

        if part_data:
            decoded = _decode_base64_urlsafe(part_data)
            if part_mime == "text/plain":
                text_content.append(decoded)
            elif part_mime == "text/html" and not text_content:
                text_content.append(_strip_html(decoded))
        elif part.get("parts"):
            nested_text = _extract_body_text(part)
            if nested_text:
                text_content.append(nested_text)

    return "\n".join(text_content).strip()


def fetch_bank_emails(access_token: str, max_results: int = 15) -> List[Dict[str, Any]]:
    """
    Fetches the latest Indian banking and UPI alert emails using Gmail REST API.
    Returns parsed metadata and text bodies for Gemini extraction.
    """
    if not access_token:
        raise ValueError("Google access token required")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "User-Agent": "Divvy-App/1.0",
    }

    # 1. Search for matching messages
    query_params = urllib.parse.urlencode({
        "q": BANK_EMAIL_QUERY,
        "maxResults": max_results,
    })
    list_url = f"{GMAIL_API_BASE}/messages?{query_params}"

    req = urllib.request.Request(list_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=8.0) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='ignore')
        print(f"⚠️ Gmail API error ({e.code}): {err_body}")
        raise ValueError(f"Gmail API error ({e.code}): Unable to access inbox. Please check token permissions.")
    except Exception as e:
        print(f"⚠️ Gmail fetch error: {e}")
        raise ValueError(f"Network error connecting to Gmail: {str(e)}")

    messages = data.get("messages", [])
    if not messages:
        return []

    email_items = []

    # 2. Fetch details for each message
    for msg_meta in messages[:max_results]:
        msg_id = msg_meta.get("id")
        if not msg_id:
            continue

        detail_url = f"{GMAIL_API_BASE}/messages/{msg_id}?format=full"
        detail_req = urllib.request.Request(detail_url, headers=headers)
        try:
            with urllib.request.urlopen(detail_req, timeout=5.0) as detail_resp:
                msg_json = json.loads(detail_resp.read().decode())
        except Exception as err:
            print(f"Skipping message {msg_id}: {err}")
            continue

        headers_list = msg_json.get("payload", {}).get("headers", [])
        header_map = {h["name"].lower(): h["value"] for h in headers_list if "name" in h and "value" in h}

        subject = header_map.get("subject", "Bank Alert")
        sender = header_map.get("from", "Bank")
        date_str = header_map.get("date", "")
        snippet = msg_json.get("snippet", "")
        body_text = _extract_body_text(msg_json.get("payload", {}))

        # Use full text or fallback to snippet
        full_text = body_text if len(body_text) > 40 else snippet

        email_items.append({
            "message_id": msg_id,
            "subject": subject,
            "sender": sender,
            "email_date": date_str,
            "snippet": snippet,
            "body_text": full_text[:2000],  # cap length to stay token-efficient
        })

    return email_items
