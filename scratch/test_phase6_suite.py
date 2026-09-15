import urllib.request
import urllib.parse
import json
import uuid
import io

BASE_URL = "http://localhost:8000"

def json_request(method, path, body=None, token=None):
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

def multipart_post(path, fields=None, files=None, token=None):
    url = f"{BASE_URL}{path}"
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    buffer = io.BytesIO()

    if fields:
        for name, value in fields.items():
            buffer.write(f"--{boundary}\r\n".encode("utf-8"))
            buffer.write(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
            buffer.write(f"{value}\r\n".encode("utf-8"))

    if files:
        for name, (filename, content, content_type) in files.items():
            buffer.write(f"--{boundary}\r\n".encode("utf-8"))
            buffer.write(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
            buffer.write(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
            buffer.write(content if isinstance(content, bytes) else content.encode("utf-8"))
            buffer.write(b"\r\n")

    buffer.write(f"--{boundary}--\r\n".encode("utf-8"))
    body = buffer.getvalue()

    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Content-Length": str(len(body)),
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            status_code = resp.status
            content = resp.read().decode("utf-8")
            return status_code, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        return e.code, json.loads(content) if content else {"error": str(e)}

def run_tests():
    print("🚀 Starting Phase 6 Next-Gen Financial Automations Test Suite...\n")

    # 1. Signup / Auth
    rand_id = uuid.uuid4().hex[:6]
    signup_data = {
        "email": f"phase6_{rand_id}@divvy.app",
        "username": f"phase6_{rand_id}",
        "password": "Password123!",
        "display_name": "Phase 6 Tester",
    }
    code, auth_res = json_request("POST", "/api/auth/signup", signup_data)
    assert code == 201, f"Signup failed: {code} {auth_res}"
    token = auth_res["access_token"]
    print(f"✅ 1. User authenticated: {signup_data['username']}")

    # 2. Feature 1: User Profile UPI ID Settings
    print("\n⚡ Testing Feature 1: 1-Tap UPI Settlements & Dynamic QR Generator...")
    update_data = {
        "full_name": "Kabir Ramteke",
        "upi_id": "kabir@okhdfcbank",
    }
    code, update_res = json_request("PUT", "/api/auth/me", update_data, token=token)
    assert code == 200, f"Failed updating UPI ID: {code} {update_res}"
    assert update_res.get("upi_id") == "kabir@okhdfcbank", f"Mismatch upi_id: {update_res}"
    print(f"✅ Profile updated with UPI ID: {update_res.get('upi_id')}")

    code, me_res = json_request("GET", "/api/auth/me", token=token)
    assert code == 200, f"Failed fetching me: {code} {me_res}"
    assert me_res.get("upi_id") == "kabir@okhdfcbank", f"GET /me upi_id mismatch: {me_res}"
    print(f"✅ Verified GET /api/auth/me returns configured UPI ID: {me_res.get('upi_id')}")

    # 3. Feature 2: Smart Receipt OCR Endpoint
    print("\n🍽️ Testing Feature 2: Smart Receipt OCR & Itemized Dining Splitter...")
    # Create a small valid 1x1 PNG image
    tiny_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {
        "file": ("test_receipt.png", tiny_png, "image/png"),
    }
    code, scan_res = multipart_post("/api/receipts/scan", files=files, token=token)
    assert code == 200, f"Failed receipt scan: {code} {scan_res}"
    assert scan_res.get("success") is True, f"Scan not marked success: {scan_res}"
    receipt_data = scan_res.get("data", {})
    assert "items" in receipt_data, f"No items in scan data: {receipt_data}"
    assert "grand_total" in receipt_data, f"No grand_total in scan data: {receipt_data}"
    print(f"✅ POST /api/receipts/scan response: Merchant='{receipt_data.get('merchant_name')}', Items={len(receipt_data.get('items', []))}, GrandTotal={receipt_data.get('grand_total')}")

    # 4. Feature 3: Bank Statement Parsing & Batch Import
    print("\n📄 Testing Feature 3: Bank Statement (PDF & CSV) Bulk Importer...")
    sample_csv = """Txn Date,Description,Chq/Ref No,Debit,Credit,Balance
10/09/2026,UPI-SWIGGY-12345,REF998877,450.00,,45500.00
11/09/2026,UBER RIDES INDIA,REF998878,280.00,,45220.00
12/09/2026,SALARY CREDIT,REF998879,,55000.00,100220.00
12/09/2026,AMAZON PAY INDIA,REF998880,1299.00,,98921.00
"""
    files = {
        "file": ("hdfc_statement.csv", sample_csv, "text/csv"),
    }
    code, parse_res = multipart_post("/api/statements/parse", files=files, token=token)
    assert code == 200, f"Failed parse statement: {code} {parse_res}"
    txns = parse_res.get("transactions", [])
    print(f"✅ POST /api/statements/parse successfully extracted {len(txns)} transactions!")
    assert len(txns) >= 3, f"Expected at least 3 transactions, got {len(txns)}"

    # Verify extracted fields
    first_txn = txns[0]
    print(f"   Sample Txn 1: Date={first_txn['date']}, Desc='{first_txn['description']}', Amount=₹{first_txn['amount']}, Type={first_txn['type']}")

    # Batch import into personal expenses
    import_payload = {
        "transactions": [
            {
                "date": t["date"],
                "description": t["description"],
                "amount": t["amount"],
                "category": t["category"] if t["category"] != "other" else "food",
                "notes": f"Batch Statement Ref {t.get('reference_no')}"
            }
            for t in txns if t["type"] == "debit"
        ]
    }
    code, import_res = json_request("POST", "/api/statements/import", import_payload, token=token)
    assert code == 200, f"Failed statement import: {code} {import_res}"
    assert import_res.get("imported_count") == len(import_payload["transactions"]), f"Mismatch count: {import_res}"
    print(f"✅ POST /api/statements/import successfully imported {import_res.get('imported_count')} expenses into personal tracker!")

    # Test Duplicate Detection: Parse the exact same CSV again
    code, parse_res_2 = multipart_post("/api/statements/parse", files=files, token=token)
    assert code == 200, f"Failed second parse: {code} {parse_res_2}"
    txns_2 = parse_res_2.get("transactions", [])
    duplicates = [t for t in txns_2 if t.get("is_duplicate")]
    print(f"✅ Duplicate Detection Engine: Detected {len(duplicates)} matching duplicates out of {len(txns_2)} transactions!")
    assert len(duplicates) >= len(import_payload["transactions"]), f"Expected at least {len(import_payload['transactions'])} duplicates flagged, got {len(duplicates)}"

    print("\n🎉 ALL PHASE 6 AUTOMATION & PAYMENT SUITE TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
