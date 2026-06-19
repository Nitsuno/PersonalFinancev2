from ml.forecaster import forecast_expense


def backtest(monthly: list[dict], min_train: int = 3) -> dict:
    """Walk-forward backtest over the monthly summary rows.

    For each month at index i >= min_train, fit on monthly[:i] and predict
    monthly[i]["expense"]. Returns MAE (RM), the count of predictions, and the
    per-month detail. Returns mae=None when there isn't enough history.
    """
    errors = []
    per_month = []
    for i in range(min_train, len(monthly)):
        fc = forecast_expense(monthly[:i])
        if fc is None:
            continue
        actual = float(monthly[i]["expense"])
        pred = fc["pred"]
        err = abs(actual - pred)
        errors.append(err)
        per_month.append({
            "month": monthly[i]["month"],
            "actual": round(actual, 2),
            "pred": round(pred, 2),
            "abs_error": round(err, 2),
        })

    mae = round(sum(errors) / len(errors), 2) if errors else None
    return {"mae": mae, "n_predictions": len(errors), "per_month": per_month}


def main() -> None:
    import analytics.queries as q
    import db.postgres as pgdb

    frame = q.build_frame(pgdb.load_transactions(), pgdb.load_labeled())
    monthly = q.monthly_summary(frame)
    result = backtest(monthly)

    if result["mae"] is None:
        print(f"Not enough history to backtest (have {len(monthly)} months).")
        return

    print(f"MAE: RM {result['mae']:.2f} over {result['n_predictions']} backtested months\n")
    print(f"{'month':<9} {'actual':>10} {'pred':>10} {'abs_error':>10}")
    for row in result["per_month"]:
        print(f"{row['month']:<9} {row['actual']:>10.2f} {row['pred']:>10.2f} {row['abs_error']:>10.2f}")


if __name__ == "__main__":
    main()
