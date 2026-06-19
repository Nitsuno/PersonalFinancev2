from fastapi import APIRouter

import db.postgres as pgdb

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset")
def reset():
    """Wipe all transactions, labels, budgets and the trained model.

    Lets you start fresh and re-import statements one by one.
    """
    pgdb.clear_all()
    return {"reset": True}
