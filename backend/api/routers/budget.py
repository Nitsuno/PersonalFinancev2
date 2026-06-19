from fastapi import APIRouter
from pydantic import RootModel

import analytics.queries as q
import db.postgres as pgdb

router = APIRouter(prefix="/budget", tags=["budget"])


class BudgetLimits(RootModel[dict[str, float]]):
    """A mapping of category -> monthly limit."""


@router.get("")
def get_budget(month: str | None = None):
    frame = q.build_frame(pgdb.load_transactions(), pgdb.load_labeled())
    limits = pgdb.load_budget_limits()
    if month and month != "all":
        rows = q.budget_vs_actual(frame, month, limits)
        return {"month": month, "limits": limits, "rows": rows}
    rows = q.budget_vs_actual(frame, None, limits) if not frame.empty else []
    return {"month": "all", "limits": limits, "rows": rows}


@router.post("")
def set_budget(limits: BudgetLimits):
    pgdb.save_budget_limits(limits.root)
    return {"saved": len(limits.root)}
