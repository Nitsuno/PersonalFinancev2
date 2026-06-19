"""Next-month spend forecast via simple linear regression on the monthly series.

Kept separate from the classifier (ml/trainer.py): this is regression, not
classification, and is independently testable.
"""

import math


def _next_month_label(month: str) -> str:
    year, mon = (int(p) for p in month.split("-"))
    mon += 1
    if mon > 12:
        mon = 1
        year += 1
    return f"{year:04d}-{mon:02d}"


def linear_fit(values: list[float]) -> dict:
    """Ordinary least-squares fit of values against their index 0..n-1.

    Returns slope, intercept, residual std, and the prediction at x = n.
    """
    n = len(values)
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    sxx = sum((x - mean_x) ** 2 for x in xs)
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values))
    slope = sxy / sxx if sxx else 0.0
    intercept = mean_y - slope * mean_x
    residuals = [y - (slope * x + intercept) for x, y in zip(xs, values)]
    std = math.sqrt(sum(r * r for r in residuals) / max(n - 2, 1))
    return {"slope": slope, "intercept": intercept, "std": std, "predict_next": slope * n + intercept}


def forecast_expense(monthly: list[dict]) -> dict | None:
    """Project next month's total expense with a prediction band.

    Takes the monthly_summary output (needs each row's "month" and "expense").
    Returns None when there are fewer than two months to fit a line.
    """
    if len(monthly) < 2:
        return None
    values = [float(m["expense"]) for m in monthly]
    fit = linear_fit(values)
    pred = max(fit["predict_next"], 0.0)
    band = 1.5 * fit["std"]
    return {
        "next_month": _next_month_label(monthly[-1]["month"]),
        "pred": round(pred, 2),
        "low": round(max(pred - band, 0.0), 2),
        "high": round(pred + band, 2),
        "history": [{"month": m["month"], "expense": round(float(m["expense"]), 2)} for m in monthly],
    }
