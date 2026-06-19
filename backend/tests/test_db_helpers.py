import pandas as pd

from db.postgres import fill_dates, month_filter_mask


def test_fill_dates_keeps_real_per_day_dates():
    df = pd.DataFrame({"Vendor": ["A", "B"], "Date": ["2026-01-05", "2026-01-09"]})
    out = fill_dates(df, "2026-01")
    assert list(out["Date"]) == ["2026-01-05", "2026-01-09"]


def test_fill_dates_falls_back_to_month_label_when_missing():
    df = pd.DataFrame({"Vendor": ["A", "B"]})  # no Date column at all
    out = fill_dates(df, "2025-06")
    assert list(out["Date"]) == ["2025-06", "2025-06"]


def test_fill_dates_fills_only_blank_rows():
    df = pd.DataFrame({"Vendor": ["A", "B"], "Date": ["2026-01-05", None]})
    out = fill_dates(df, "2026-01")
    assert list(out["Date"]) == ["2026-01-05", "2026-01"]


def test_month_filter_mask_matches_per_day_and_legacy():
    df = pd.DataFrame({"Date": ["2026-01-05", "2026-02-01", "2025-06"]})
    assert list(df[month_filter_mask(df, "2026-01")]["Date"]) == ["2026-01-05"]
    assert list(df[month_filter_mask(df, "2025-06")]["Date"]) == ["2025-06"]
    assert df[month_filter_mask(df, "1999-01")].empty
