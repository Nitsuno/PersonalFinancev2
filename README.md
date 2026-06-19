# Finance Manager

Turn raw bank statements into a personal-finance dashboard. Upload a PDF, let the
built-in ML classifier sort your transactions, then explore your money through
interactive charts, forecasts, and budgets, all running locally on your machine.

<p align="center">
  <img src="assets/demo.gif" alt="Insights dashboard animated cash-flow, Sankey flow, and a full scroll through every chart" width="100%">
</p>

<p align="center">
  <em>The Insights page: animated cash-flow, an income → spending Sankey, a spending calendar, next-month forecast, and anomaly detection.</em>
</p>

---

## Features

- **No manual data entry.** Drop in a bank-statement PDF and it parses every row.
- **It learns your categories.** A TF-IDF + Logistic Regression model predicts
  categories for new transactions from the ones you've already labeled.
- **See where your money actually goes.** All-time Sankey flow, drill-down
  treemap, spending calendar, and per-category trends.
- **Plan ahead.** A regression forecast projects next month's spend, and the
  Budget page tracks average monthly spend against limits you set.
- **Yours, locally.** Everything runs in Docker on your machine — your
  statements never leave it.

## Quick start (Docker)

The fastest path: one command brings up the database, API, and UI.

```bash
git clone <your-repo-url>
cd Personal-Financev2
docker compose up --build
```

Then open:

| What | URL |
| --- | --- |
| **App** (start here) | http://localhost:5173 |
| Interactive API docs | http://localhost:8000/docs |

That's it. The Postgres data persists in a Docker volume between restarts.

## First run: from PDF to dashboard

The app guides you through a short workflow the first time:

1. **Upload**: drop a statement PDF (`/upload`). The month is read from the
   filename, e.g. `Jun 2025.pdf` → `2025-06`.
2. **Review**: confirm the parsed rows look right (`/review`).
3. **Label**: categorize a handful of transactions (`/label`). Use *bulk by
   vendor* to label many at once.
4. **Predict**: train the model and let it categorize the rest (`/predict`).
   Predictions are shown for you to accept — nothing is saved until you do.
5. **Insights & Budget**: explore the dashboard (`/insights`) and set spending
   limits (`/budget`).

> The more you label, the sharper the predictions get.

## Architecture

```
[ React + Vite SPA ]  ⇄  [ FastAPI backend ]  ⇄  [ PostgreSQL ]
    (the only UI)          (parsing, ML, API)       (transactions,
                                                     labels, model)
```

The backend wraps a small Python core — `parsers/pdf_parser.py`,
`preprocessing/preprocessor.py`, `ml/trainer.py`, `ml/forecaster.py`,
`analytics/queries.py`, and `db/postgres.py` behind a thin REST layer.

## Run the backend locally (without Docker)

Useful for development with hot-reload.

```bash
cd backend
pip install -r requirements.txt
export DATABASE_URL=postgresql://finance:finance@localhost:5432/finance
uvicorn main:app --reload    # run from backend/ so `import db.postgres` resolves
```

You'll need a Postgres reachable at `DATABASE_URL` (the `db` service in
`docker-compose.yml` works for this). The frontend reads the API location from
`VITE_API_URL` (defaults to `http://localhost:8000`).

```bash
cd frontend
npm install
npm run dev
```

## API reference

### Data & model

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/transactions/upload` | Parse a statement PDF and store its rows |
| GET | `/transactions` | List transactions (optional `?month=`) |
| POST | `/labels` | Label one transaction |
| POST | `/labels/bulk` | Label a list (used by *bulk by vendor*) |
| POST | `/model/train` | Train the classifier; returns CV metrics |
| POST | `/model/predict` | Predict categories for unlabeled rows (ephemeral) |
| POST | `/admin/reset` | Wipe all stored data |

### Analytics & planning

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/analytics/monthly` | Per-month income, expense, net, running balance |
| GET | `/analytics/categories` | Spend per category (`?month=all` for all-time) |
| GET | `/analytics/treemap` | Category → vendor spend hierarchy |
| GET | `/analytics/sankey` | Income → fixed/variable/savings → categories (all-time) |
| GET | `/analytics/daily` | Daily spend totals (drives the calendar) |
| GET | `/analytics/anomalies` | Outlier transactions by category z-score |
| GET | `/forecast` | Next-month expenditure prediction |
| GET | `/budget` | Average monthly spend vs. your limits |
| POST | `/budget` | Save category spending limits |

The Sankey and Budget views aggregate across **all** uploaded months, so they
stay consistent with the other all-time charts.

## Tech stack

- **Frontend:** React + Vite, D3 for the custom charts
- **Backend:** FastAPI (Python 3.14)
- **ML:** scikit-learn (TF-IDF + Logistic Regression classifier, linear forecaster)
- **Database:** PostgreSQL 16
- **Orchestration:** Docker Compose
