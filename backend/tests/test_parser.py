from parsers.pdf_parser import (
    align_dates,
    clean_desc_robust,
    extract_date_amount_pairs,
    month_from_filename,
    strip_summary_rows,
)


def test_clean_desc_groups_a_transaction():
    desc = ["SALE DEBIT", "GRAB", "KUALA LUMPUR, MY"]
    amount = ["15.00-"]
    df = clean_desc_robust(desc, amount)
    assert len(df) == 1
    row = df.iloc[0]
    assert row["Vendor"] == "GRAB"
    assert row["Sale Type"] == "SALE DEBIT"
    assert row["Location"] == "KUALA LUMPUR, MY"
    assert row["Amount"] == "15.00-"


def test_clean_desc_detects_account_ref_number():
    desc = ["PYMT FROM A/C", "123456", "SALE DEBIT", "SHOPEE"]
    amount = ["50.00+", "20.00-"]
    df = clean_desc_robust(desc, amount)
    assert len(df) == 2
    assert df.iloc[0]["Account"] == "123456"
    assert df.iloc[1]["Vendor"] == "SHOPEE"


def test_strip_summary_rows_removes_trailing_totals():
    desc = ["SALE DEBIT", "GRAB", "BEGINNING BALANCE :", "TOTAL DEBIT :"]
    amount = ["15.00-", "100.00", "15.00"]
    d, a = strip_summary_rows(desc, amount)
    assert "TOTAL DEBIT :" not in d
    assert "BEGINNING BALANCE :" not in d
    assert d == ["SALE DEBIT", "GRAB"]
    assert a == ["15.00-"]


def test_strip_summary_rows_no_summary_is_noop():
    desc = ["SALE DEBIT", "GRAB"]
    amount = ["15.00-"]
    d, a = strip_summary_rows(desc, amount)
    assert d == desc
    assert a == amount


def test_extract_date_amount_pairs_reads_iso_date_and_amount():
    # Each transaction's first line is "DD/MM/YY <type> <amount><sign> <balance>".
    text = "\n".join([
        "BEGINNING BALANCE 3,335.51",
        "01/01/26 SALE DEBIT 175.00- 3,160.51",
        "Ezypay Ezypay*Anyti*",
        "Kuala Lumpur, MY",
        "01/01/26 IBK FUND TFR TO A/C 154.30+ 3,006.21",
        "31/01/26 IBK FUND TFR FR A/C 1,550.00- 1,884.29",
    ])
    pairs = extract_date_amount_pairs(text)
    assert pairs == [
        ("2026-01-01", "175.00-"),
        ("2026-01-01", "154.30+"),
        ("2026-01-31", "1,550.00-"),
    ]


def test_align_dates_returns_dates_when_amounts_match():
    pairs = [("2026-01-01", "175.00-"), ("2026-01-02", "10.00+")]
    amount_list = ["175.00-", "10.00+"]
    assert align_dates(pairs, amount_list) == ["2026-01-01", "2026-01-02"]


def test_align_dates_returns_none_when_amounts_disagree():
    # A misalignment must not silently attach wrong dates — fall back to None.
    pairs = [("2026-01-01", "175.00-")]
    amount_list = ["175.00-", "10.00+"]
    assert align_dates(pairs, amount_list) is None


def test_clean_desc_attaches_date_when_date_list_given():
    desc = ["SALE DEBIT", "GRAB", "KUALA LUMPUR, MY", "SALE DEBIT", "SHOPEE"]
    amount = ["15.00-", "20.00-"]
    dates = ["2026-01-05", "2026-01-09"]
    df = clean_desc_robust(desc, amount, dates)
    assert list(df["Date"]) == ["2026-01-05", "2026-01-09"]
    assert df.iloc[0]["Vendor"] == "GRAB"
    assert df.iloc[1]["Vendor"] == "SHOPEE"


def test_month_from_filename():
    assert month_from_filename("Jun 2025.pdf") == "2025-06"
    assert month_from_filename("June 2025.pdf") == "2025-06"
    assert month_from_filename("Dec 2024.pdf") == "2024-12"
    assert month_from_filename("/some/path/Jan 2026.pdf") == "2026-01"


def test_month_from_filename_rejects_bad_names():
    assert month_from_filename("statement.pdf") is None
    assert month_from_filename("2025-06.pdf") is None
    assert month_from_filename("") is None
