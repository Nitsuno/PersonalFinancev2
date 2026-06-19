import pandas as pd


def preprocess_df(raw_df: pd.DataFrame) -> pd.DataFrame:
    """
    Input: raw DataFrame with at least columns: Vendor, Amount, Sale Type, Location, Account.
    Output: cleaned DataFrame with Debit_amt, Credit_amt, Details columns added.
    """
    df = raw_df.copy()

    clean_amount = df['Amount'].str.replace(',', '')

    debit_strings = clean_amount.where(clean_amount.str.endswith('-')).str.rstrip('-')
    df['Debit_amt'] = pd.to_numeric(debit_strings, errors='coerce').fillna(0.0)

    credit_strings = clean_amount.where(clean_amount.str.endswith('+')).str.rstrip('+')
    df['Credit_amt'] = pd.to_numeric(credit_strings, errors='coerce').fillna(0.0)

    split_vendor = df['Vendor'].str.split('*', n=1, expand=True)
    df['Vendor'] = split_vendor[0].str.strip()
    df['Details'] = split_vendor[1].str.strip() if 1 in split_vendor.columns else pd.Series("", index=df.index)

    df['Details'] = df['Details'].replace('', 'No Details')
    df['Vendor'] = df['Vendor'].str.replace('Ezypay', 'ANYTIME FITNESS')
    df['Vendor'] = df['Vendor'].str.split('-').str[0]
    df['Vendor'] = df['Vendor'].str.split(',').str[0]
    df["Details"] = df["Details"].fillna("No Details")
    df.dropna(how='any', inplace=True)
    df.replace({"Vendor": {'': '7-ELEVEN'}}, inplace=True)

    return df
