"""Statistical outlier detection: z-score of each expense within its category."""

import pandas as pd


def zscore_anomalies(frame: pd.DataFrame, threshold: float = 2.0) -> list[dict]:
    """Flag expense transactions whose amount is |z| >= threshold within its category.

    Returns the flagged rows sorted by descending |z|. A category needs at least
    two transactions and non-zero spread to produce a z-score.
    """
    spend = frame[frame["debit"] > 0].copy()
    if spend.empty:
        return []

    grouped = spend.groupby("category")["debit"]
    mean = grouped.transform("mean")
    # population std (ddof=0) so a single-row category yields 0, not NaN
    std = grouped.transform(lambda s: s.std(ddof=0))
    spend["z"] = (spend["debit"] - mean) / std.replace(0.0, pd.NA)
    spend = spend.dropna(subset=["z"])

    flagged = spend[spend["z"].abs() >= threshold].sort_values("z", key=lambda s: s.abs(), ascending=False)
    return [
        {
            "date": row["date"], "vendor": row["vendor"], "category": row["category"],
            "amount": round(float(row["debit"]), 2), "z": round(float(row["z"]), 2),
        }
        for _, row in flagged.iterrows()
    ]
