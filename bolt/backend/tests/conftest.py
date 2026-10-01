import os
import sys
from pathlib import Path

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture()
def app():
    from app import create_app
    from app.models import db
    from app.routes import _RATE_LIMIT_BUCKETS

    app = create_app(
        {
            "TESTING": True,
            "FLASK_ENV": "testing",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "SECRET_KEY": "test-secret",
            "UPLOAD_FOLDER": str(BACKEND_ROOT / "uploads"),
            "RATE_LIMIT_UPLOAD_PER_MIN": 1000,
            "RATE_LIMIT_REVIEW_PER_MIN": 1000,
        }
    )

    with app.app_context():
        db.create_all()

    _RATE_LIMIT_BUCKETS.clear()
    yield app

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
