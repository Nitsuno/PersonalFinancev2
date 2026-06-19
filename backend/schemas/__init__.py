from pydantic import BaseModel, ConfigDict, Field


class LabelIn(BaseModel):
    """A single category assignment. Identity is (Date, Vendor, Amount)."""

    # populate_by_name lets the JSON use "Sale Type" while the attribute is sale_type
    model_config = ConfigDict(populate_by_name=True)

    Date: str
    Vendor: str
    Amount: str
    Category: str
    Details: str | None = None
    Location: str | None = None
    sale_type: str | None = Field(default=None, alias="Sale Type")
    Debit_amt: float | None = None
    Credit_amt: float | None = None
    Account: str | None = None

    def to_row(self) -> dict:
        """Flatten to the column names db/postgres.py expects (with 'Sale Type')."""
        return {
            "Date": self.Date,
            "Vendor": self.Vendor,
            "Amount": self.Amount,
            "Category": self.Category,
            "Details": self.Details,
            "Location": self.Location,
            "Sale Type": self.sale_type,
            "Debit_amt": self.Debit_amt,
            "Credit_amt": self.Credit_amt,
            "Account": self.Account,
        }


class UploadResult(BaseModel):
    month: str
    inserted: int
    duplicate: bool


class TrainMetrics(BaseModel):
    n_samples: int
    n_classes: int
    class_counts: dict
    cv_accuracy: float | None
    cv_f1_weighted: float | None
    cv_f1_macro: float | None
    n_splits: int
