import os
import tempfile

import db.postgres as pgdb
from parsers.pdf_parser import (
    align_dates,
    clean_desc_robust,
    get_entry_dates,
    get_master_lists,
    strip_summary_rows,
)
from preprocessing.preprocessor import preprocess_df


def ingest_pdf(pdf_bytes: bytes, month_label: str) -> int:
    """Runs the full PDF ingest pipeline:
    parse -> strip summary rows -> clean -> preprocess -> save
    Returns the number of rows inserted (0 if the month already exists)
    """
    # pdfplumber needs a path, but an upload arrives as bytes, so we use a temp file.
    fd, path = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(pdf_bytes)
        desc_list, amount_list = get_master_lists(path)
        date_pairs = get_entry_dates(path)
    finally:
        os.remove(path)

    desc_list, amount_list = strip_summary_rows(desc_list, amount_list)
    date_list = align_dates(date_pairs, amount_list)
    raw_df = clean_desc_robust(desc_list, amount_list, date_list)
    if raw_df.empty:
        return 0
    df = preprocess_df(raw_df)
    return pgdb.save_transactions(df, month_label)
