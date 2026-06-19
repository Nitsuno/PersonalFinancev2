from fastapi import APIRouter

import analytics.queries as q
import db.postgres as pgdb
from ml.forecaster import forecast_expense

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("")
def forecast():
    frame = q.build_frame(pgdb.load_transactions(), pgdb.load_labeled())
    return forecast_expense(q.monthly_summary(frame))
