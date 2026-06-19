from fastapi import APIRouter, HTTPException

import ml.trainer as trainer
import services.predict as predict_service
from schemas import TrainMetrics

router = APIRouter(prefix="/model", tags=["model"])


@router.post("/train", response_model=TrainMetrics)
def train_model():
    try:
        return trainer.train()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/predict")
def predict():
    try:
        df = predict_service.predict_unlabelled()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return df.to_dict(orient="records")
