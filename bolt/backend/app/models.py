"""
Database models for traffic violation reports
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from .statuses import ReportStatus

db = SQLAlchemy()


class User(db.Model):
    """Simple user model for API authentication and role-based access."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="citizen")
    created_by_user_id = db.Column(db.Integer, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_by_user_id": self.created_by_user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class ViolationReport(db.Model):
    """Model for storing violation reports"""
    
    __tablename__ = 'violation_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    violation_type = db.Column(db.String(200), nullable=False)  # Can store multiple types
    evidence_path = db.Column(db.String(500), nullable=False)
    confidence_score = db.Column(db.Float)
    status = db.Column(db.String(50), default=ReportStatus.PENDING.value, index=True)
    
    # Additional fields from UI design
    location = db.Column(db.String(200))
    user_id = db.Column(db.String(100), default="anonymous")
    user_name = db.Column(db.String(120), default="Anonymous")
    comments = db.Column(db.Text)
    fine_amount = db.Column(db.Float, nullable=True)
    admin_notes = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        """Convert model to dictionary for JSON response"""
        return {
            'id': self.id,
            'violation_type': self.violation_type,
            'evidence_path': self.evidence_path,
            'confidence_score': self.confidence_score,
            'status': self.status,
            'location': self.location,
            'user_id': self.user_id,
            'user_name': self.user_name,
            'comments': self.comments,
            'fine_amount': self.fine_amount,
            'admin_notes': self.admin_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None
        }
    
    def __repr__(self):
        return f'<ViolationReport {self.id}: {self.violation_type}>'


class LoginAudit(db.Model):
    """Tracks login attempts for monitoring and security review."""

    __tablename__ = "login_audits"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    user_id = db.Column(db.Integer, nullable=True, index=True)
    role = db.Column(db.String(20), nullable=True)
    success = db.Column(db.Boolean, nullable=False, default=False, index=True)
    ip_address = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(300), nullable=True)
    reason = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "user_id": self.user_id,
            "role": self.role,
            "success": self.success,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
