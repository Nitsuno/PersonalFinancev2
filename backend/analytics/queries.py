"""Analytical rollups over the labeled transaction set.

Every function here is pure. It takes DataFrames / dicts and returns plain
Python structures, so the analyst logic is unit-testable without a database.
The routers in api/routers/analytics.py load the data and call these.
"""

import pandas as pd

IDENTITY = ["Date", "Vendor", "Amount"]

# Categories that are not discretionary spending are excluded from spend rollups.
NON_SPENDING = {"Income", "Transfer"}

# Fixed vs variable split for the Sankey flow. Anything not listed and still a
# spending category is treated as variable.
CATEGORY_GROUP = {
    "Utilities & Bills": "Fixed",
    "Fitness & Health": "Fixed",
    "Medical": "Fixed",
    "Dining & Food": "Variable",
    "Transport": "Variable",
    "Groceries": "Variable",
    "Retail & Shopping": "Variable",
    "Entertainment": "Variable",
    "Other": "Variable",
}


def build_frame(txns: pd.DataFrame, labels: pd.DataFrame) -> pd.DataFrame:
    """Join transactions to their labels and normalize the columns analytics need.

    Returns a frame with: date (ISO str), month (YYYY-MM), vendor, debit, credit,
    category (label, or "Uncategorized" for unlabeled expense rows).
    """
    if txns.empty:
        return pd.DataFrame(columns=["date", "month", "vendor", "debit", "credit", "category"])

    df = txns.copy()
    if not labels.empty:
        lab = labels[IDENTITY + ["Category"]].drop_duplicates(IDENTITY)
        df = df.merge(lab, on=IDENTITY, how="left")
    else:
        df["Category"] = None

    df["debit"] = pd.to_numeric(df.get("Debit_amt"), errors="coerce").fillna(0.0)
    df["credit"] = pd.to_numeric(df.get("Credit_amt"), errors="coerce").fillna(0.0)
    df["date"] = df["Date"].astype(str)
    df["month"] = df["date"].str.slice(0, 7)
    df["vendor"] = df["Vendor"].fillna("").astype(str)

    is_expense = df["debit"] > 0
    df["category"] = df["Category"]
    df.loc[is_expense & df["category"].isna(), "category"] = "Uncategorized"
    df["category"] = df["category"].fillna("")
    return df[["date", "month", "vendor", "debit", "credit", "category"]]


def _spending(frame: pd.DataFrame) -> pd.DataFrame:
    """Expense rows that count as discretionary spending."""
    return frame[(frame["debit"] > 0) & (~frame["category"].isin(NON_SPENDING))]


def monthly_summary(frame: pd.DataFrame, starting_balance: float = 0.0) -> list[dict]:
    """Per-month income, expense, net and a running balance, oldest first."""
    if frame.empty:
        return []
    grouped = frame.groupby("month").agg(income=("credit", "sum"), expense=("debit", "sum"))
    grouped = grouped.sort_index()
    out = []
    balance = starting_balance
    for month, row in grouped.iterrows():
        income = round(float(row["income"]), 2)
        expense = round(float(row["expense"]), 2)
        net = round(income - expense, 2)
        balance = round(balance + net, 2)
        out.append({"month": month, "income": income, "expense": expense, "net": net, "balance": balance})
    return out


def category_breakdown(frame: pd.DataFrame, month: str | None) -> list[dict]:
    """Spend per category, largest first (income/transfer excluded).

    ``month=None`` aggregates across every month (all-time).
    """
    scoped = frame if month is None else frame[frame["month"] == month]
    spend = _spending(scoped)
    if spend.empty:
        return []
    totals = spend.groupby("category")["debit"].sum().sort_values(ascending=False)
    return [{"category": cat, "amount": round(float(amt), 2)} for cat, amt in totals.items()]


def treemap(frame: pd.DataFrame, month: str | None) -> dict:
    """category -> vendor hierarchy of spend (real two-level drill).

    ``month=None`` aggregates across every month (all-time).
    """
    scoped = frame if month is None else frame[frame["month"] == month]
    spend = _spending(scoped)
    root = {"name": "Spending", "children": []}
    if spend.empty:
        return root
    for cat, cat_df in spend.groupby("category"):
        vendors = cat_df.groupby("vendor")["debit"].sum().sort_values(ascending=False)
        children = [{"name": v or "(unknown)", "value": round(float(amt), 2)} for v, amt in vendors.items()]
        root["children"].append({"name": cat, "children": children})
    root["children"].sort(key=lambda c: sum(v["value"] for v in c["children"]), reverse=True)
    return root


def daily_spend(frame: pd.DataFrame) -> list[dict]:
    """One {date, amount} per day that had expense drives the calendar heatmap."""
    spend = _spending(frame)
    if spend.empty:
        return []
    totals = spend.groupby("date")["debit"].sum().sort_index()
    return [{"date": d, "amount": round(float(amt), 2)} for d, amt in totals.items()]


def sankey(frame: pd.DataFrame, month: str | None) -> dict:
    """Income -> Fixed/Variable/Savings -> categories.

    ``month=None`` aggregates across every month (all-time).
    """
    scoped = frame if month is None else frame[frame["month"] == month]
    income = round(float(scoped["credit"].sum()), 2)
    spend = _spending(scoped)
    by_cat = spend.groupby("category")["debit"].sum()

    bucket_of = {cat: CATEGORY_GROUP.get(cat, "Variable") for cat in by_cat.index}
    bucket_totals = {"Fixed": 0.0, "Variable": 0.0}
    for cat, amt in by_cat.items():
        bucket_totals[bucket_of[cat]] += float(amt)
    savings = round(max(income - sum(bucket_totals.values()), 0.0), 2)

    nodes, links = [], []
    seen = set()

    def node(name):
        if name not in seen:
            seen.add(name)
            nodes.append({"name": name})

    node("Income")
    for bucket in ("Fixed", "Variable"):
        if bucket_totals[bucket] > 0:
            node(bucket)
            links.append({"source": "Income", "target": bucket, "value": round(bucket_totals[bucket], 2)})
    if savings > 0:
        node("Savings")
        links.append({"source": "Income", "target": "Savings", "value": savings})
    for cat, amt in by_cat.sort_values(ascending=False).items():
        node(cat)
        links.append({"source": bucket_of[cat], "target": cat, "value": round(float(amt), 2)})
    return {"nodes": nodes, "links": links}


def budget_vs_actual(frame: pd.DataFrame, month: str | None, limits: dict) -> list[dict]:
    """Per-category actual vs budget with % and a green/amber/red status band.

    ``month=None`` averages each category's total spend over the number of
    distinct months in the whole dataset, so actuals stay comparable to the
    monthly limits.
    """
    if month is None:
        spend = _spending(frame)
        n_months = frame["month"].nunique() or 1
        totals = spend.groupby("category")["debit"].sum()
        actuals = (totals / n_months).to_dict()
    else:
        spend = _spending(frame[frame["month"] == month])
        actuals = spend.groupby("category")["debit"].sum().to_dict()
    categories = set(actuals) | set(limits)
    rows = []
    for cat in categories:
        actual = round(float(actuals.get(cat, 0.0)), 2)
        budget = round(float(limits.get(cat, 0.0)), 2)
        pct = round(actual / budget * 100, 1) if budget > 0 else None
        if pct is None:
            status = "none"
        elif pct >= 100:
            status = "over"
        elif pct >= 75:
            status = "close"
        else:
            status = "under"
        rows.append({
            "category": cat, "actual": actual, "budget": budget,
            "remaining": round(budget - actual, 2), "pct": pct, "status": status,
        })
    rows.sort(key=lambda r: (r["pct"] is None, -(r["pct"] or 0)))
    return rows
