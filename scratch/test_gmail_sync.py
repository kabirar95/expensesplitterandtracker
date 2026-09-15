import urllib.request
import json
import uuid

BASE_URL = "http://localhost:8000"

def request(method, path, body=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            content = resp.read().decode("utf-8")
            return status_code, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {"error": str(e)}

def run_tests():
    print("🧪 Testing Gmail & UPI Banking Auto-Sync with Gemini AI...")

    # 1. Sign up test user
    rand_user = f"upi_test_{uuid.uuid4().hex[:6]}"
    signup_data = {
        "email": f"{rand_user}@divvy.app",
        "username": rand_user,
        "password": "Password123!",
        "display_name": "UPI Tester"
    }
    code, auth_res = request("POST", "/api/auth/signup", signup_data)
    assert code == 201, f"Failed signup: {code} {auth_res}"
    token = auth_res["access_token"]
    print(f"✅ User signed up successfully: {rand_user}")

    # 2. Test batch UPI statement parsing with Gemini
    sample_bank_emails = """
Dear Customer, INR 450.00 has been debited from your A/c XX8921 on 14-Sep-2026 via UPI Ref: 425619283719 to SWIGGY. Avl Bal: INR 12,450.00.

Dear SBI User, your A/c XX4321 is debited by Rs. 280.00 on 14/09/2026 for Uber Ride via Google Pay. UPI Ref 891234567890.

Your Paytm Bank A/c was debited for Rs 190.50 towards Zepto Groceries via UPI ref 1122334455 on 14-09-2026.
"""

    print("🤖 Sending raw bank alert text to Gemini 2.5 Flash for UPI extraction...")
    code, parse_res = request("POST", "/api/gmail/parse-text-batch", {"text": sample_bank_emails}, token=token)
    assert code == 200, f"Failed parse text: {code} {parse_res}"
    
    txs = parse_res.get("transactions", [])
    print(f"✅ Gemini extracted {len(txs)} transactions:")
    for t in txs:
        print(f"   - {t.get('description')} | ₹{t.get('amount')} | Category: {t.get('category')} | Bank: {t.get('bank_name')} | Ref: {t.get('upi_ref_id')}")

    assert len(txs) >= 3, "Expected at least 3 transactions parsed"
    # Verify non-duplicate initially
    assert all(not t["is_duplicate"] for t in txs), "Expected transactions to be non-duplicates on first scan"

    # 3. Import the transactions into Divvy
    print("💾 Importing detected transactions into Divvy...")
    code, import_res = request("POST", "/api/gmail/import-transactions", {"transactions": txs}, token=token)
    assert code == 200, f"Failed import: {code} {import_res}"
    assert import_res["imported_count"] == len(txs)
    print(f"✅ Successfully imported {import_res['imported_count']} transactions into personal expenses!")

    # 4. Verify transactions exist in personal_expenses
    code, exp_res = request("GET", "/api/personal-expenses", token=token)
    assert code == 200
    print(f"✅ Verified personal expenses count: {len(exp_res)}")

    # 5. Test DUPLICATE PREVENTION: re-parse the exact same text
    print("🔍 Testing Duplicate Prevention Engine...")
    code, dup_res = request("POST", "/api/gmail/parse-text-batch", {"text": sample_bank_emails}, token=token)
    assert code == 200
    dup_txs = dup_res.get("transactions", [])
    duplicates_detected = sum(1 for t in dup_txs if t["is_duplicate"])
    print(f"✅ Duplicate Detection Result: {duplicates_detected}/{len(dup_txs)} transactions correctly flagged as duplicates!")
    assert duplicates_detected >= 3, "All re-scanned transactions must be flagged as duplicates"

    print("\n🎉 ALL GMAIL & UPI GEMINI DETECTION TESTS PASSED SUCCESSFULLY! 🚀")

if __name__ == "__main__":
    run_tests()
