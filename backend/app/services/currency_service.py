# ============================================================
# CURRENCY SERVICE — Real-time & Cached Exchange Rates
# ============================================================
# NOTE: The DEFAULT_RATES_TO_INR below is ONLY an offline fallback
# in case the device is offline, in airplane mode, or external APIs
# are unreachable.
# Real-time exchange rates are actively fetched from live public
# exchange APIs (ExchangeRate-API and Frankfurter ECB) on an hourly schedule!
# ============================================================

import time
import urllib.request
import json
from datetime import datetime

# Offline safety-net fallback (used ONLY if no internet connection)
DEFAULT_RATES_TO_INR = {
    "INR": 1.0,
    "USD": 84.10,
    "EUR": 91.50,
    "GBP": 107.20,
    "AED": 22.90,
    "THB": 2.45,
    "SGD": 63.50,
    "JPY": 0.58,
    "CAD": 61.80,
    "AUD": 55.40,
}

CURRENCY_METADATA = {
    "INR": {"name": "Indian Rupee", "symbol": "₹", "flag": "🇮🇳"},
    "USD": {"name": "US Dollar", "symbol": "$", "flag": "🇺🇸"},
    "EUR": {"name": "Euro", "symbol": "€", "flag": "🇪🇺"},
    "GBP": {"name": "British Pound", "symbol": "£", "flag": "🇬🇧"},
    "AED": {"name": "UAE Dirham", "symbol": "د.إ", "flag": "🇦🇪"},
    "THB": {"name": "Thai Baht", "symbol": "฿", "flag": "🇹🇭"},
    "SGD": {"name": "Singapore Dollar", "symbol": "S$", "flag": "🇸🇬"},
    "JPY": {"name": "Japanese Yen", "symbol": "¥", "flag": "🇯🇵"},
    "CAD": {"name": "Canadian Dollar", "symbol": "C$", "flag": "🇨🇦"},
    "AUD": {"name": "Australian Dollar", "symbol": "A$", "flag": "🇦🇺"},
}

_cache = {
    "last_fetched": 0,
    "rates_to_inr": DEFAULT_RATES_TO_INR.copy(),
    "source": "Initial Cache",
    "is_live": False,
    "last_updated": None,
}

CACHE_TTL_SECONDS = 3600  # Refresh hourly to balance real-time accuracy and network bandwidth


def fetch_live_rates() -> bool:
    """
    Attempts to fetch live exchange rates from public forex APIs.
    Primary: open.er-api.com
    Secondary: api.frankfurter.dev (European Central Bank)
    Returns True if live rates were fetched and cached.
    """
    # 1. Try Primary: open.er-api.com
    try:
        req = urllib.request.Request(
            "https://open.er-api.com/v6/latest/USD",
            headers={"User-Agent": "Divvy-App/1.0"}
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                usd_rates = data.get("rates", {})
                usd_to_inr = float(usd_rates.get("INR", 84.10))

                updated = {"INR": 1.0}
                for curr in DEFAULT_RATES_TO_INR:
                    if curr == "INR":
                        continue
                    if curr == "USD":
                        updated["USD"] = round(usd_to_inr, 2)
                    elif curr in usd_rates and usd_rates[curr] > 0:
                        # 1 unit of foreign curr = (1 / usd_rates[curr]) * usd_to_inr in INR
                        rate_in_inr = (1.0 / float(usd_rates[curr])) * usd_to_inr
                        updated[curr] = round(rate_in_inr, 2)
                    else:
                        updated[curr] = DEFAULT_RATES_TO_INR[curr]

                _cache["rates_to_inr"] = updated
                _cache["last_fetched"] = time.time()
                _cache["source"] = "ExchangeRate-API (Live)"
                _cache["is_live"] = True
                _cache["last_updated"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
                return True
    except Exception:
        pass

    # 2. Try Secondary: api.frankfurter.dev
    try:
        req = urllib.request.Request(
            "https://api.frankfurter.dev/v1/latest?base=USD",
            headers={"User-Agent": "Divvy-App/1.0"}
        )
        with urllib.request.urlopen(req, timeout=3.0) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                usd_rates = data.get("rates", {})
                usd_to_inr = float(usd_rates.get("INR", 84.10))

                updated = {"INR": 1.0}
                for curr in DEFAULT_RATES_TO_INR:
                    if curr == "INR":
                        continue
                    if curr == "USD":
                        updated["USD"] = round(usd_to_inr, 2)
                    elif curr in usd_rates and usd_rates[curr] > 0:
                        rate_in_inr = (1.0 / float(usd_rates[curr])) * usd_to_inr
                        updated[curr] = round(rate_in_inr, 2)
                    else:
                        updated[curr] = DEFAULT_RATES_TO_INR[curr]

                _cache["rates_to_inr"] = updated
                _cache["last_fetched"] = time.time()
                _cache["source"] = "Frankfurter ECB (Live)"
                _cache["is_live"] = True
                _cache["last_updated"] = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
                return True
    except Exception:
        pass

    return False


def get_exchange_rates() -> dict:
    """
    Returns currency rates relative to INR, refreshing from live API if cache has expired.
    """
    now = time.time()
    if now - _cache["last_fetched"] >= CACHE_TTL_SECONDS:
        fetch_live_rates()

    return _build_rates_response(_cache["rates_to_inr"])


def _build_rates_response(rates: dict) -> dict:
    result = {}
    for code, rate in rates.items():
        meta = CURRENCY_METADATA.get(code, {"name": code, "symbol": code, "flag": "🌐"})
        result[code] = {
            "code": code,
            "name": meta["name"],
            "symbol": meta["symbol"],
            "flag": meta["flag"],
            "rate_to_inr": rate,
        }
    return {
        "base": "INR",
        "is_live": _cache["is_live"],
        "source": _cache["source"],
        "last_updated": _cache["last_updated"] or datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "currencies": result,
    }


def convert_to_inr(amount: float, from_currency: str) -> float:
    """Converts any foreign currency amount directly into INR (₹) at current rates."""
    curr = (from_currency or "INR").upper()
    now = time.time()
    if now - _cache["last_fetched"] >= CACHE_TTL_SECONDS:
        fetch_live_rates()

    rates = _cache["rates_to_inr"]
    multiplier = rates.get(curr, DEFAULT_RATES_TO_INR.get(curr, 1.0))
    return round(amount * multiplier, 2)
