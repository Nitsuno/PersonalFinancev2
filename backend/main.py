from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import db.postgres as pgdb
from api.routers import admin, analytics, budget, forecast, labels, model, transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables exist before the first request is served.
    pgdb.init_db()
    yield


app = FastAPI(title="Finance Manager v2", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(labels.router)
app.include_router(model.router)
app.include_router(analytics.router)
app.include_router(forecast.router)
app.include_router(budget.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
