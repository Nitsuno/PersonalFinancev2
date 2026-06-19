import pandas as pd

import db.postgres as pgdb
import ml.trainer as trainer

IDENTITY = ["Date", "Vendor", "Amount"]


def compute_unlabelled(txns: pd.DataFrame, labeled: pd.DataFrame) -> pd.DataFrame:
    """Anti-join transactions against labels on (Date, Vendor, Amount).

    Returns the transaction rows that have no matching label yet.
    """
    if txns.empty:
        return txns.copy()
    if labeled.empty:
        return txns.copy()
    merged = txns.merge(
        labeled[IDENTITY].drop_duplicates(),
        on=IDENTITY,
        how="left",
        indicator=True,
    )
    return merged[merged["_merge"] == "left_only"].drop(columns="_merge")


def predict_unlabelled() -> pd.DataFrame:
    """Predict categories for transactions that have no label yet.

    Computes the unlabelled set as an anti-join between
    transactions and labels on (Date, Vendor, Amount), then runs the model.
    Returns the unlabelled rows with predicted_category + confidence columns.
    """
    txns = pgdb.load_transactions()
    if txns.empty:
        return txns.assign(predicted_category=[], confidence=[])

    unlabelled = compute_unlabelled(txns, pgdb.load_labeled())

    if unlabelled.empty:
        return unlabelled.assign(predicted_category=[], confidence=[])

    labels, confidence = trainer.predict(unlabelled)
    unlabelled = unlabelled.copy()
    unlabelled["predicted_category"] = labels
    unlabelled["confidence"] = confidence
    return unlabelled
