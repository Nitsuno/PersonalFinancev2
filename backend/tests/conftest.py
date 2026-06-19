import os

import pytest

# Integration tests need a real Postgres. Skip them all when DATABASE_URL is unset
# (e.g. running the fast unit suite locally without docker).
requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="DATABASE_URL not set — skipping DB-backed integration tests",
)


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    from main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def clean_db():
    """Wipe the database before each DB-backed test so they stay isolated."""
    if not os.environ.get("DATABASE_URL"):
        yield
        return
    import db.postgres as pgdb

    pgdb.init_db()
    pgdb.clear_all()
    yield
