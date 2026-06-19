from ml.forecaster import forecast_expense, linear_fit
from tests.backtest_forecaster import backtest


def test_linear_fit_recovers_slope_and_intercept():
    # y = 100 + 50x exactly.
    fit = linear_fit([100, 150, 200, 250])
    assert round(fit["slope"], 6) == 50.0
    assert round(fit["intercept"], 6) == 100.0
    assert round(fit["predict_next"], 6) == 300.0  # x = 4


def test_forecast_expense_projects_next_month_with_band():
    months = [
        {"month": "2025-11", "expense": 1000.0},
        {"month": "2025-12", "expense": 1100.0},
        {"month": "2026-01", "expense": 1200.0},
        {"month": "2026-02", "expense": 1300.0},
    ]
    fc = forecast_expense(months)
    assert fc["next_month"] == "2026-03"
    assert round(fc["pred"]) == 1400  # continues the +100 trend
    assert fc["low"] <= fc["pred"] <= fc["high"]
    assert [h["month"] for h in fc["history"]] == [m["month"] for m in months]


def test_forecast_expense_handles_too_little_data():
    assert forecast_expense([]) is None
    one = forecast_expense([{"month": "2026-01", "expense": 500.0}])
    assert one is None


def test_backtest_perfect_on_linear_series():
    # A clean +100/month trend: each refit extrapolates the next point exactly,
    # so MAE should be ~0.
    months = [
        {"month": "2025-08", "expense": 1000.0},
        {"month": "2025-09", "expense": 1100.0},
        {"month": "2025-10", "expense": 1200.0},
        {"month": "2025-11", "expense": 1300.0},
        {"month": "2025-12", "expense": 1400.0},
        {"month": "2026-01", "expense": 1500.0},
    ]
    result = backtest(months, min_train=3)
    assert result["n_predictions"] == 3  # indices 3, 4, 5
    assert result["mae"] == 0.0
    assert [r["month"] for r in result["per_month"]] == ["2025-11", "2025-12", "2026-01"]


def test_backtest_handles_too_little_history():
    months = [
        {"month": "2026-01", "expense": 500.0},
        {"month": "2026-02", "expense": 600.0},
    ]
    result = backtest(months, min_train=3)
    assert result["mae"] is None
    assert result["n_predictions"] == 0
