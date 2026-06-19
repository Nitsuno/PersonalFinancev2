import pandas as pd

from preprocessing.preprocessor import preprocess_df


def _raw(**overrides):
    base = {
        "Vendor": "GRAB",
        "Amount": "15.00-",
        "Sale Type": "SALE DEBIT",
        "Location": "KUALA LUMPUR, MY",
        "Account": "",
    }
    base.update(overrides)
    return pd.DataFrame([base])


def test_debit_parsing():
    out = preprocess_df(_raw(Amount="15.00-"))
    assert out.iloc[0]["Debit_amt"] == 15.0
    assert out.iloc[0]["Credit_amt"] == 0.0


def test_credit_parsing():
    out = preprocess_df(_raw(Amount="2,500.50+"))
    assert out.iloc[0]["Credit_amt"] == 2500.50
    assert out.iloc[0]["Debit_amt"] == 0.0


def test_vendor_and_details_split_on_star():
    out = preprocess_df(_raw(Vendor="GRAB*RIDE HOME"))
    assert out.iloc[0]["Vendor"] == "GRAB"
    assert out.iloc[0]["Details"] == "RIDE HOME"


def test_missing_details_becomes_no_details():
    out = preprocess_df(_raw(Vendor="SHOPEE"))
    assert out.iloc[0]["Details"] == "No Details"


def test_ezypay_standardized():
    out = preprocess_df(_raw(Vendor="Ezypay*Gym"))
    assert out.iloc[0]["Vendor"] == "ANYTIME FITNESS"
