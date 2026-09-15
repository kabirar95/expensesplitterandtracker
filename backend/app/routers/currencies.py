# ============================================================
# CURRENCIES ROUTER — Rates & Conversion Endpoints
# ============================================================

from typing import Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.currency_service import get_exchange_rates, convert_to_inr

router = APIRouter(prefix="/api/currencies", tags=["Currencies"])


class ConvertCurrencyRequest(BaseModel):
    amount: float = Field(..., gt=0)
    from_currency: str = Field(default="USD")


class ConvertCurrencyResponse(BaseModel):
    amount: float
    from_currency: str
    amount_in_inr: float
    rate_to_inr: float


@router.get("/rates")
async def get_rates() -> Dict[str, Any]:
    """Get all supported currencies and their current exchange rates to INR."""
    return get_exchange_rates()


@router.post("/convert", response_model=ConvertCurrencyResponse)
async def convert_currency(data: ConvertCurrencyRequest):
    """Convert an amount from any supported currency to INR."""
    curr = data.from_currency.upper()
    rates_data = get_exchange_rates()
    curr_map = rates_data.get("currencies", {})
    rate_info = curr_map.get(curr, curr_map.get("INR", {"rate_to_inr": 1.0}))
    rate_val = rate_info["rate_to_inr"]
    converted = round(data.amount * rate_val, 2)
    return ConvertCurrencyResponse(
        amount=data.amount,
        from_currency=curr,
        amount_in_inr=converted,
        rate_to_inr=rate_val,
    )
