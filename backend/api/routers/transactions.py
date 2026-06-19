from fastapi import APIRouter, HTTPException, UploadFile

import db.postgres as pgdb
import services.ingest as ingest
import services.predict as predict
from parsers.pdf_parser import month_from_filename
from schemas import UploadResult

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/upload", response_model=UploadResult)
async def upload(file: UploadFile):
    month = month_from_filename(file.filename)
    if month is None:
        raise HTTPException(
            status_code=400,
            detail="Filename must look like 'Jun 2025.pdf' so the month can be read from it.",
        )
    pdf_bytes = await file.read()
    inserted = ingest.ingest_pdf(pdf_bytes, month)
    return UploadResult(month=month, inserted=inserted, duplicate=inserted == 0)


@router.get("")
def list_transactions(month: str | None = None):
    df = pgdb.load_transactions()
    if month:
        df = df[pgdb.month_filter_mask(df, month)]
    return df.to_dict(orient="records")


@router.get("/unlabelled")
def list_unlabelled():
    df = predict.compute_unlabelled(pgdb.load_transactions(), pgdb.load_labeled())
    return df.to_dict(orient="records")
