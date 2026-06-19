import os
import re

import pandas as pd
import pdfplumber


def get_master_lists(pdf_path):
    """Return description and amount per entry"""
    all_desc = []
    all_amounts = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table and len(table) > 1:
                # table[1][0] is the column for Descriptions
                # table[1][1] is the column for Amounts
                # We split by \n and extend our master lists
                raw_desc = table[1][0].split('\n') if table[1][0] else []
                raw_amt = table[1][1].split('\n') if table[1][1] else []

                all_desc.extend(raw_desc)
                all_amounts.extend(raw_amt)

    return all_desc, all_amounts


def get_entry_dates(pdf_path):
    """Return a list of (date, amount) pairs found in the statement"""
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join((page.extract_text() or "") for page in pdf.pages)
    return extract_date_amount_pairs(text)


SUMMARY_MARKERS = ("BALANCE", "TOTAL")


def strip_summary_rows(desc_list, amount_list):
    """Remove the trailing BALANCE / total-credit / total-debit summary rows so only real transactions remain"""
    desc = list(desc_list)
    amt = list(amount_list)

    n = 0
    for line in reversed(desc):
        if line and any(marker in line.upper() for marker in SUMMARY_MARKERS):
            n += 1
        else:
            break

    if n:
        desc = desc[:-n]
        amt = amt[:-n] if len(amt) >= n else amt

    return desc, amt


# A transaction's first line looks like:
#   "01/01/26 SALE DEBIT 175.00- 3,160.51"
# i.e. an entry date, a description, the signed transaction amount, then the
# running statement balance. The date sits in a visual column that
# extract_table() drops, so we recover it from the page text instead.
DATE_LINE_RE = re.compile(
    r"^(\d{2})/(\d{2})/(\d{2})\s+.*?([\d,]+\.\d{2}[-+])\s+[\d,]+\.\d{2}\s*$"
)


def extract_date_amount_pairs(text):
    """Pull (iso_date, amount_token) for every transaction line, in document order"""
    pairs = []
    for line in text.split("\n"):
        match = DATE_LINE_RE.match(line.strip())
        if match:
            dd, mm, yy, amount = match.groups()
            pairs.append((f"20{yy}-{mm}-{dd}", amount))
    return pairs


def align_dates(pairs, amount_list):
    """Return a date list parallel to amount_list, or None if they disagree"""
    if [amount for _, amount in pairs] != [a.strip() for a in amount_list]:
        return None
    return [date for date, _ in pairs]


def clean_desc_robust(desc_list, amount_list, date_list=None):
    """
    Manual filtering of transaction type

    Return collection of separated entries in one dataframe
    """
    records = []
    amt_ptr = 0
    current_tx = None

    TRIGGERS = {
        "SALE DEBIT", "PYMT FROM A/C", "FUND TRANSFER TO A/",
        "IBK FUND TFR FR A/C", "TRANSFER FROM A/C", "IBK FUND TFR TO A/C",
        "FPX PAYMENT FR A/", "PAYMENT VIA MYDEBIT", "PRE-AUTH REFUND"}

    def is_ref_number(line):
        return line.isdigit() or (len(line) > 5 and line[-1] == 'Q')

    def is_location(line):
        return ", MY" in line

    for i, line in enumerate(desc_list):
        line = line.strip()
        if not line or line == "BEGINNING BALANCE" or "BALANCE :" in line:
            continue

        if line in TRIGGERS:
            if line == "SALE DEBIT" and i + 1 < len(desc_list):
                next_line = desc_list[i+1].strip()
                if next_line in TRIGGERS:
                    continue

            if line == "PAYMENT VIA MYDEBIT" and i + 1 < len(desc_list):
                next_line = desc_list[i+1].strip()
                if next_line in TRIGGERS:
                    continue

            if line == "PRE-AUTH REFUND" and i + 1 < len(desc_list):
                next_line = desc_list[i+1].strip()
                if next_line in TRIGGERS:
                    continue

            if current_tx and (current_tx["Vendor"] or current_tx["Account"] or current_tx["Location"]):
                records.append(current_tx)

            current_tx = {"Sale Type": line, "Vendor": "", "Location": "", "Account": "", "Amount": None}

            if amt_ptr < len(amount_list):
                current_tx['Amount'] = amount_list[amt_ptr]
                # date_list is parallel to amount_list — same index, same row
                if date_list is not None and amt_ptr < len(date_list):
                    current_tx['Date'] = date_list[amt_ptr]
                amt_ptr += 1
            continue

        if not current_tx:
            continue

        if is_location(line):
            current_tx["Location"] = line
        elif is_ref_number(line):
            current_tx["Account"] = line
        else:
            # Fallback: treat as vendor (append if multiple vendor lines)
            if current_tx["Vendor"]:
                current_tx["Vendor"] += f" {line}"
            else:
                current_tx["Vendor"] = line

    if current_tx:
        records.append(current_tx)

    return pd.DataFrame(records)


month_map = {
    "Jan": "01",
    "Feb": "02",
    "Mar": "03",
    "Apr": "04",
    "May": "05",
    "Jun": "06",
    "Jul": "07",
    "Aug": "08",
    "Sep": "09",
    "Oct": "10",
    "Nov": "11",
    "Dec": "12",
}


def month_from_filename(filename):
    """Get "YYYY-MM" month label from an uploaded file's name

    Accepts names like "Jun 2025.pdf" / "June 2025.pdf" 
    Returns None if the name does not match
    """
    if not filename:
        return None
    base = os.path.basename(filename)
    name = os.path.splitext(base)[0].strip()
    match = re.match(r"([A-Za-z]{3,})\s+(\d{4})", name)
    if not match:
        return None
    month_key = match.group(1)[:3].title()
    if month_key not in month_map:
        return None
    return f"{match.group(2)}-{month_map[month_key]}"
