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
    print("🧪 Testing Phase 5 Backend Endpoints...")

    # 1. Currencies Rates & Convert
    code, rates = request("GET", "/api/currencies/rates")
    assert code == 200, f"Failed currencies rates: {code} {rates}"
    assert "INR" in rates["currencies"] and "USD" in rates["currencies"]
    print("✅ GET /api/currencies/rates passed! Currencies supported:", list(rates["currencies"].keys()))

    code, conv = request("POST", "/api/currencies/convert", {"amount": 100, "from_currency": "USD"})
    assert code == 200, f"Failed convert: {code} {conv}"
    print(f"✅ POST /api/currencies/convert passed: $100 USD = ₹{conv['amount_in_inr']} INR")

    # 2. Signup / Login test user
    rand_user = f"pwa_test_{uuid.uuid4().hex[:6]}"
    signup_data = {
        "email": f"{rand_user}@divvy.app",
        "username": rand_user,
        "password": "Password123!",
        "display_name": "PWA Tester"
    }
    code, auth_res = request("POST", "/api/auth/signup", signup_data)
    assert code == 201, f"Failed signup: {code} {auth_res}"
    token = auth_res["access_token"]
    print(f"✅ User signed up successfully: {rand_user}")

    # 3. Create Recurring Rules (one due today)
    from datetime import date
    today_str = date.today().isoformat()
    rule_data = {
        "description": "Netflix 4K Ultra",
        "amount": 649.0,
        "currency": "INR",
        "category": "entertainment",
        "frequency": "monthly",
        "start_date": today_str,
        "next_run_date": today_str,
        "notes": "Family plan"
    }
    code, rule_res = request("POST", "/api/recurring", rule_data, token=token)
    assert code == 201, f"Failed create recurring: {code} {rule_res}"
    rule_id = rule_res["id"]
    print(f"✅ POST /api/recurring created: {rule_res['description']} (Next run: {rule_res['next_run_date']})")

    # 4. List Recurring Rules
    code, rules_list = request("GET", "/api/recurring", token=token)
    assert code == 200 and len(rules_list) >= 1
    print(f"✅ GET /api/recurring returned {len(rules_list)} active rule(s)")

    # 5. Process Due Recurring Bills
    code, process_res = request("POST", "/api/recurring/process-due", token=token)
    assert code == 200, f"Failed process due: {code} {process_res}"
    assert process_res["processed_count"] >= 1
    print(f"✅ POST /api/recurring/process-due auto-logged: {process_res['logged_descriptions']}")

    # 6. Verify Personal Expenses has the auto-logged bill
    code, exp_res = request("GET", "/api/personal-expenses", token=token)
    assert code == 200
    matched = [e for e in exp_res if "Netflix" in e["description"]]
    assert len(matched) >= 1
    print(f"✅ Verified expense in personal_expenses: {matched[0]['description']} - ₹{matched[0]['amount']} ({matched[0]['notes']})")

    # 7. Verify next_run_date was advanced
    code, updated_rules = request("GET", "/api/recurring", token=token)
    rule_after = [r for r in updated_rules if r["id"] == rule_id][0]
    assert rule_after["next_run_date"] > today_str
    print(f"✅ Next run date successfully advanced to: {rule_after['next_run_date']}")

    # 8. Clean up / Delete rule
    code, _ = request("DELETE", f"/api/recurring/{rule_id}", token=token)
    assert code == 204
    print("✅ DELETE /api/recurring passed!")

    print("\n🎉 ALL PHASE 5 BACKEND AUTOMATION TESTS PASSED SUCCESSFULLY! 🚀")

if __name__ == "__main__":
    run_tests()
