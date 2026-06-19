from fastapi import APIRouter

import analytics.queries as q
import db.postgres as pgdb
from analytics.anomalies import zscore_anomalies

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _frame():
    return q.build_frame(pgdb.load_transactions(), pgdb.load_labeled())


def _latest_month(frame, month: str | None) -> str | None:
    if month:
        return month
    if frame.empty:
        return None
    return frame["month"].max()


@router.get("/monthly")
def monthly():
    return q.monthly_summary(_frame())


@router.get("/categories")
def categories(month: str | None = None):
    frame = _frame()
    if month == "all":
        return {"month": None, "rows": q.category_breakdown(frame, None)}
    m = _latest_month(frame, month)
    return {"month": m, "rows": q.category_breakdown(frame, m) if m else []}


@router.get("/treemap")
def treemap(month: str | None = None):
    frame = _frame()
    if month == "all":
        return {"month": None, "tree": q.treemap(frame, None)}
    m = _latest_month(frame, month)
    return {"month": m, "tree": q.treemap(frame, m) if m else {"name": "Spending", "children": []}}


@router.get("/sankey")
def sankey(month: str | None = None):
    frame = _frame()
    if month and month != "all":
        return {"month": month, "sankey": q.sankey(frame, month)}
    return {"month": "all", "sankey": q.sankey(frame, None)}


@router.get("/daily")
def daily():
    return q.daily_spend(_frame())


@router.get("/anomalies")
def anomalies(threshold: float = 2.0):
    return zscore_anomalies(_frame(), threshold=threshold)
