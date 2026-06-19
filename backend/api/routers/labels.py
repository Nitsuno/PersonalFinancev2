import pandas as pd
from fastapi import APIRouter

import db.postgres as pgdb
from schemas import LabelIn

router = APIRouter(prefix="/labels", tags=["labels"])


@router.post("")
def create_label(label: LabelIn):
    df = pd.DataFrame([label.to_row()])
    pgdb.save_labeled_batch(df)
    return {"saved": 1}


@router.post("/bulk")
def create_labels(labels: list[LabelIn]):
    if not labels:
        return {"saved": 0}
    df = pd.DataFrame([label.to_row() for label in labels])
    pgdb.save_labeled_batch(df)
    return {"saved": len(labels)}
