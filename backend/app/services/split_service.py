# ============================================================
# SPLIT SERVICE — Expense Split Calculation Engine
# ============================================================
# Handles split logic:
#   1. Equal: divides total amount equally among selected members
#   2. Percentage: computes amounts from custom percentages
#   3. Exact: verifies custom exact amounts match total
# ============================================================

from typing import List
from app.schemas.expense import SplitDetail


def calculate_splits(
    total_amount: float,
    split_type: str,
    member_names: List[str],
    custom_splits: List[SplitDetail] = None,
) -> List[SplitDetail]:
    """
    Calculate and validate split details for an expense.
    """
    if not member_names:
        raise ValueError("At least one member must be included in the split")

    if split_type == "equal":
        per_person = round(total_amount / len(member_names), 2)
        # Handle small rounding difference on last person
        calculated_splits = []
        accumulated = 0.0
        for i, name in enumerate(member_names):
            if i == len(member_names) - 1:
                share = round(total_amount - accumulated, 2)
            else:
                share = per_person
                accumulated += share
            calculated_splits.append(
                SplitDetail(
                    user_name=name,
                    amount=share,
                    percentage=round((share / total_amount) * 100, 2) if total_amount > 0 else 0,
                )
            )
        return calculated_splits

    elif split_type == "percentage":
        if not custom_splits:
            raise ValueError("Percentage splits require custom split details")
        
        total_pct = sum(s.percentage or 0 for s in custom_splits)
        if abs(total_pct - 100.0) > 0.01:
            raise ValueError(f"Percentages must add up to 100% (got {total_pct}%)")

        calculated_splits = []
        for s in custom_splits:
            pct = s.percentage or 0
            share = round((pct / 100.0) * total_amount, 2)
            calculated_splits.append(
                SplitDetail(user_name=s.user_name, amount=share, percentage=pct)
            )
        return calculated_splits

    elif split_type == "exact":
        if not custom_splits:
            raise ValueError("Exact splits require custom split details")

        total_exact = sum(s.amount for s in custom_splits)
        if abs(total_exact - total_amount) > 0.01:
            raise ValueError(f"Exact amounts sum ({total_exact}) must equal total expense ({total_amount})")

        calculated_splits = []
        for s in custom_splits:
            share = round(s.amount, 2)
            pct = round((share / total_amount) * 100, 2) if total_amount > 0 else 0
            calculated_splits.append(
                SplitDetail(user_name=s.user_name, amount=share, percentage=pct)
            )
        return calculated_splits

    else:
        raise ValueError(f"Unsupported split type: {split_type}")
