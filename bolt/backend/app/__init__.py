from pathlib import Path
import logging
import os
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
from sqlalchemy import text
from .models import db


migrate = Migrate()


def _configure_logging(app: Flask) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="ts=%(asctime)s level=%(levelname)s logger=%(name)s msg=%(message)s",
    )
    app.logger.setLevel(logging.INFO)


def _ensure_runtime_schema(app: Flask) -> None:
    """Lightweight schema patch for existing SQLite dev DBs."""
    uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not uri.startswith("sqlite:///"):
        return

    with db.engine.connect() as conn:
        columns = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        names = {row[1] for row in columns}
        if "created_by_user_id" not in names:
            conn.execute(text("ALTER TABLE users ADD COLUMN created_by_user_id INTEGER"))
            conn.commit()

        vr_columns = conn.execute(text("PRAGMA table_info(violation_reports)")).fetchall()
        vr_names = {row[1] for row in vr_columns}
        if "user_name" not in vr_names:
            conn.execute(text("ALTER TABLE violation_reports ADD COLUMN user_name VARCHAR(120) DEFAULT 'Anonymous'"))
            conn.commit()


def create_app(test_config: dict | None = None):
    load_dotenv()
    app = Flask(__name__)

    backend_dir = Path(__file__).resolve().parent.parent
    instance_dir = backend_dir / "instance"
    upload_dir = backend_dir / "uploads"
    model_path = backend_dir / "yolov8n.pt"

    instance_dir.mkdir(parents=True, exist_ok=True)
    upload_dir.mkdir(parents=True, exist_ok=True)

    default_sqlite = f"sqlite:///{(instance_dir / 'traffic.db').as_posix()}"
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", default_sqlite)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
    app.config["JWT_EXPIRATION_HOURS"] = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    app.config["CORS_ORIGINS"] = os.getenv("CORS_ORIGINS", "*")
    app.config["FLASK_ENV"] = os.getenv("FLASK_ENV", "development")
    app.config["UPLOAD_FOLDER"] = upload_dir.as_posix()
    app.config["MODEL_PATH"] = model_path.as_posix()
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB
    app.config["VIDEO_MIN_VIOLATION_FRAMES"] = 3
    app.config["DEFAULT_VIOLATION_CONFIDENCE_THRESHOLD"] = 0.88
    app.config["STRICT_RULE_THRESHOLDS"] = {
        "No Helmet": 0.93,
        "Using Mobile Phone While Riding": 0.95,
    }
    app.config["RATE_LIMIT_UPLOAD_PER_MIN"] = 30
    app.config["RATE_LIMIT_REVIEW_PER_MIN"] = 60

    if test_config:
        app.config.update(test_config)

    CORS(app, resources={r"/*": {"origins": app.config["CORS_ORIGINS"]}})
    _configure_logging(app)

    db.init_app(app)
    migrate.init_app(app, db)

    from .routes import main_bp
    app.register_blueprint(main_bp)

    with app.app_context():
        if app.config["FLASK_ENV"] == "development":
            db.create_all()
            _ensure_runtime_schema(app)

    return app
