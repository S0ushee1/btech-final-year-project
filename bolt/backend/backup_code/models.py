from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class ViolationReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    violation_type = db.Column(db.String(100), nullable=False)
    evidence_path = db.Column(db.String(200), nullable=False)
    confidence_score = db.Column(db.Float)
    status = db.Column(db.String(50), default="Pending Review")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)