import pandas as pd

from tests.conftest import requires_db

CATEGORIES = ["Dining & Food", "Transport", "Groceries", "Retail & Shopping"]


def _seed_transactions(n=20):
    import db.postgres as pgdb

    rows = []
    for i in range(n):
        vendor = ["GRAB", "FAMILYMART", "SHOPEE", "MCDONALDS"][i % 4]
        rows.append({
            "Vendor": vendor,
            "Details": "No Details",
            "Location": "KUALA LUMPUR, MY",
            "Sale Type": "SALE DEBIT",
            "Amount": f"{10 + i}.00-",
            "Debit_amt": float(10 + i),
            "Credit_amt": 0.0,
            "Account": "",
        })
    pgdb.save_transactions(pd.DataFrame(rows), "2025-06")


@requires_db
def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


@requires_db
def test_upload_rejects_bad_filename(client):
    files = {"file": ("statement.pdf", b"%PDF-1.4 fake", "application/pdf")}
    r = client.post("/transactions/upload", files=files)
    assert r.status_code == 400
    assert "Jun 2025.pdf" in r.json()["detail"]


@requires_db
def test_list_transactions(client):
    _seed_transactions(8)
    r = client.get("/transactions")
    assert r.status_code == 200
    assert len(r.json()) == 8
    assert client.get("/transactions?month=2025-06").json().__len__() == 8
    assert client.get("/transactions?month=1999-01").json() == []


@requires_db
def test_train_requires_minimum_labels(client):
    _seed_transactions(20)
    txns = client.get("/transactions").json()
    # Label only 5 — below the 10-sample minimum.
    labels = [{**t, "Category": CATEGORIES[i % 4]} for i, t in enumerate(txns[:5])]
    client.post("/labels/bulk", json=labels)
    r = client.post("/model/train")
    assert r.status_code == 400


@requires_db
def test_full_slice(client):
    # 1. seed + 2. label enough to train
    _seed_transactions(20)
    txns = client.get("/transactions").json()
    labels = [{**t, "Category": CATEGORIES[i % 4]} for i, t in enumerate(txns[:16])]
    saved = client.post("/labels/bulk", json=labels).json()
    assert saved["saved"] == 16

    # 3. train
    r = client.post("/model/train")
    assert r.status_code == 200, r.text
    metrics = r.json()
    assert metrics["n_samples"] >= 10
    print(f"\n[classifier] CV accuracy: {metrics['cv_accuracy']}")

    # 4. predict — should return the 4 still-unlabelled rows
    r = client.post("/model/predict")
    assert r.status_code == 200
    preds = r.json()
    assert len(preds) == 4
    for p in preds:
        assert p["predicted_category"] in CATEGORIES
        assert 0.0 <= p["confidence"] <= 1.0


@requires_db
def test_predict_without_model_returns_400(client):
    _seed_transactions(4)
    r = client.post("/model/predict")
    assert r.status_code == 400
