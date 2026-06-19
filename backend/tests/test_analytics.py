import pandas as pd

from analytics.queries import (
    build_frame,
    category_breakdown,
    daily_spend,
    monthly_summary,
    sankey,
    treemap,
    budget_vs_actual,
)
from analytics.anomalies import zscore_anomalies


def _txns():
    # Two months. Credit_amt = income, Debit_amt = expense.
    return pd.DataFrame([
        {"Date": "2026-01-02", "Vendor": "ACME", "Amount": "2000.00+", "Debit_amt": 0.0, "Credit_amt": 2000.0, "Sale Type": "IBK", "Details": ""},
        {"Date": "2026-01-05", "Vendor": "GRAB", "Amount": "15.00-", "Debit_amt": 15.0, "Credit_amt": 0.0, "Sale Type": "SALE DEBIT", "Details": ""},
        {"Date": "2026-01-05", "Vendor": "GRAB", "Amount": "12.00-", "Debit_amt": 12.0, "Credit_amt": 0.0, "Sale Type": "SALE DEBIT", "Details": ""},
        {"Date": "2026-01-20", "Vendor": "TESCO", "Amount": "80.00-", "Debit_amt": 80.0, "Credit_amt": 0.0, "Sale Type": "SALE DEBIT", "Details": ""},
        {"Date": "2026-02-02", "Vendor": "ACME", "Amount": "2000.00+", "Debit_amt": 0.0, "Credit_amt": 2000.0, "Sale Type": "IBK", "Details": ""},
        {"Date": "2026-02-08", "Vendor": "GRAB", "Amount": "900.00-", "Debit_amt": 900.0, "Credit_amt": 0.0, "Sale Type": "SALE DEBIT", "Details": ""},
    ])


def _labels():
    return pd.DataFrame([
        {"Date": "2026-01-02", "Vendor": "ACME", "Amount": "2000.00+", "Category": "Income"},
        {"Date": "2026-01-05", "Vendor": "GRAB", "Amount": "15.00-", "Category": "Transport"},
        {"Date": "2026-01-05", "Vendor": "GRAB", "Amount": "12.00-", "Category": "Transport"},
        {"Date": "2026-01-20", "Vendor": "TESCO", "Amount": "80.00-", "Category": "Groceries"},
        {"Date": "2026-02-02", "Vendor": "ACME", "Amount": "2000.00+", "Category": "Income"},
        {"Date": "2026-02-08", "Vendor": "GRAB", "Amount": "900.00-", "Category": "Transport"},
    ])


def test_build_frame_joins_category_and_month():
    frame = build_frame(_txns(), _labels())
    assert len(frame) == 6
    jan_grab = frame[(frame["month"] == "2026-01") & (frame["vendor"] == "GRAB")]
    assert set(jan_grab["category"]) == {"Transport"}
    assert frame["month"].tolist()[0] == "2026-01"


def test_build_frame_unlabeled_expense_is_uncategorized():
    txns = _txns()
    frame = build_frame(txns, _labels().iloc[:0])  # no labels at all
    expense = frame[frame["debit"] > 0]
    assert set(expense["category"]) == {"Uncategorized"}


def test_monthly_summary_income_expense_net_balance():
    frame = build_frame(_txns(), _labels())
    months = monthly_summary(frame, starting_balance=100.0)
    assert [m["month"] for m in months] == ["2026-01", "2026-02"]
    jan = months[0]
    assert jan["income"] == 2000.0
    assert jan["expense"] == 107.0  # 15 + 12 + 80
    assert jan["net"] == 1893.0
    assert jan["balance"] == 1993.0  # 100 + 1893
    feb = months[1]
    assert feb["balance"] == round(1993.0 + (2000.0 - 900.0), 2)


def test_category_breakdown_excludes_income_and_sorts_desc():
    frame = build_frame(_txns(), _labels())
    rows = category_breakdown(frame, "2026-01")
    cats = [r["category"] for r in rows]
    assert "Income" not in cats
    assert rows[0]["category"] == "Groceries"  # 80 > 27
    assert rows[0]["amount"] == 80.0
    transport = next(r for r in rows if r["category"] == "Transport")
    assert transport["amount"] == 27.0


def test_treemap_nests_vendor_under_category():
    frame = build_frame(_txns(), _labels())
    tree = treemap(frame, "2026-01")
    transport = next(c for c in tree["children"] if c["name"] == "Transport")
    grab = next(v for v in transport["children"] if v["name"] == "GRAB")
    assert grab["value"] == 27.0


def test_daily_spend_one_entry_per_day_with_expense_only():
    frame = build_frame(_txns(), _labels())
    days = {d["date"]: d["amount"] for d in daily_spend(frame)}
    assert days["2026-01-05"] == 27.0
    assert days["2026-01-20"] == 80.0
    assert "2026-01-02" not in days  # income day, no expense


def test_sankey_routes_income_through_buckets_to_categories():
    frame = build_frame(_txns(), _labels())
    sk = sankey(frame, "2026-01")
    names = {n["name"] for n in sk["nodes"]}
    assert {"Income", "Variable", "Savings"} <= names
    # Transport is a variable category and must receive a flow from Variable.
    assert any(l["source"] == "Variable" and l["target"] == "Transport" for l in sk["links"])


def test_budget_vs_actual_computes_pct_and_status():
    frame = build_frame(_txns(), _labels())
    rows = budget_vs_actual(frame, "2026-01", {"Groceries": 100.0, "Transport": 20.0})
    groc = next(r for r in rows if r["category"] == "Groceries")
    assert groc["actual"] == 80.0 and groc["budget"] == 100.0
    assert groc["pct"] == 80.0 and groc["status"] == "close"
    trans = next(r for r in rows if r["category"] == "Transport")
    assert trans["status"] == "over"  # 27 / 20 = 135%


def test_sankey_all_time_aggregates_across_months():
    frame = build_frame(_txns(), _labels())
    sk = sankey(frame, None)
    # Transport spend spans both months: 27 (Jan) + 900 (Feb) = 927.
    transport = next(l for l in sk["links"] if l["target"] == "Transport")
    assert transport["value"] == 927.0
    # Groceries appears only in Jan but is still present all-time.
    assert any(n["name"] == "Groceries" for n in sk["nodes"])


def test_budget_vs_actual_all_time_averages_over_dataset_months():
    frame = build_frame(_txns(), _labels())
    rows = budget_vs_actual(frame, None, {"Groceries": 100.0, "Transport": 20.0})
    # Two distinct months in the dataset.
    groc = next(r for r in rows if r["category"] == "Groceries")
    assert groc["actual"] == 40.0  # 80 total / 2 months, averaged over all months
    trans = next(r for r in rows if r["category"] == "Transport")
    assert trans["actual"] == round(927.0 / 2, 2)  # (27 + 900) / 2


def test_zscore_anomalies_flags_outlier_in_category():
    frame = build_frame(_txns(), _labels())
    anomalies = zscore_anomalies(frame, threshold=1.0)
    # The 900 Transport charge dwarfs the 15/12 ones — must be flagged.
    assert any(a["vendor"] == "GRAB" and a["amount"] == 900.0 for a in anomalies)
    assert all(abs(a["z"]) >= 1.0 for a in anomalies)
