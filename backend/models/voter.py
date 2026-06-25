from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class Voter(db.Model):
    __tablename__ = 'voters'

    id = db.Column(db.Integer, primary_key=True)
    wallet_address = db.Column(db.String(42), unique=True, nullable=False, index=True)
    aadhaar_number = db.Column(db.String(12), unique=True, nullable=False, index=True)
    voter_id = db.Column(db.String(20), unique=True, nullable=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(15), nullable=True)

    # Security fields
    is_registered = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    has_voted = db.Column(db.Boolean, default=False)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    # Relationships
    biometric_data = db.relationship('BiometricData', backref='voter', lazy=True, cascade='all, delete-orphan')
    otps = db.relationship('OTP', backref='voter', lazy=True, cascade='all, delete-orphan')
    audit_logs = db.relationship('AuditLog', backref='voter', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'wallet_address': self.wallet_address,
            'aadhaar_number': self.mask_aadhaar(),
            'voter_id': self.voter_id,
            'name': self.name,
            'email': self.email,
            'is_registered': self.is_registered,
            'is_verified': self.is_verified,
            'has_voted': self.has_voted,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def mask_aadhaar(self):
        """Mask Aadhaar number for security (show only last 4 digits)"""
        if self.aadhaar_number and len(self.aadhaar_number) == 12:
            return 'XXXX-XXXX-' + self.aadhaar_number[-4:]
        return 'XXXX-XXXX-XXXX'


class BiometricData(db.Model):
    __tablename__ = 'biometric_data'

    id = db.Column(db.Integer, primary_key=True)
    voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=False)

    # Face recognition data
    face_encoding = db.Column(db.Text, nullable=True)  # Stored as JSON string
    face_image_path = db.Column(db.String(255), nullable=True)

    # Aadhaar card photo
    aadhaar_image_path = db.Column(db.String(255), nullable=True)
    aadhaar_verified = db.Column(db.Boolean, default=False)

    # Fingerprint data (optional - for future implementation)
    fingerprint_hash = db.Column(db.String(255), nullable=True)
    fingerprint_template = db.Column(db.Text, nullable=True)

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'voter_id': self.voter_id,
            'has_face_data': bool(self.face_encoding),
            'has_fingerprint': bool(self.fingerprint_hash),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class OTP(db.Model):
    __tablename__ = 'otps'

    id = db.Column(db.Integer, primary_key=True)
    voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    otp_type = db.Column(db.String(20), nullable=False)  # 'email', 'sms', 'registration', 'voting'

    is_used = db.Column(db.Boolean, default=False)
    is_valid = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def is_expired(self):
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'otp_type': self.otp_type,
            'is_used': self.is_used,
            'is_valid': self.is_valid,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), nullable=False)  # 'success', 'failure', 'suspicious'
    details = db.Column(db.Text, nullable=True)

    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'voter_id': self.voter_id,
            'action': self.action,
            'status': self.status,
            'timestamp': self.timestamp.isoformat()
        }


class AttackAlert(db.Model):
    __tablename__ = 'attack_alerts'

    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.String(50), nullable=False)  # 'brute_force', 'multiple_failed_login', 'suspicious_activity'
    severity = db.Column(db.String(20), nullable=False)  # 'low', 'medium', 'high', 'critical'
    description = db.Column(db.Text, nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)
    voter_id = db.Column(db.Integer, nullable=True)

    is_resolved = db.Column(db.Boolean, default=False)
    notified = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'description': self.description,
            'is_resolved': self.is_resolved,
            'created_at': self.created_at.isoformat()
        }
