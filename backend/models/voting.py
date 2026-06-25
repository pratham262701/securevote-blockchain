from datetime import datetime
from models.voter import db

class Candidate(db.Model):
    __tablename__ = 'candidates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    party = db.Column(db.String(100), nullable=True)
    symbol = db.Column(db.String(255), nullable=True)  # Party symbol image path
    description = db.Column(db.Text, nullable=True)
    
    # Sign language mapping (1-11)
    sign_number = db.Column(db.Integer, unique=True, nullable=False)  # 1-11
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Vote count (denormalized for quick access)
    vote_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    votes = db.relationship('Vote', backref='candidate', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'party': self.party,
            'symbol': self.symbol,
            'description': self.description,
            'sign_number': self.sign_number,
            'is_active': self.is_active,
            'vote_count': self.vote_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Vote(db.Model):
    __tablename__ = 'votes'

    id = db.Column(db.Integer, primary_key=True)
    voter_id = db.Column(db.Integer, db.ForeignKey('voters.id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    # Vote method tracking
    vote_method = db.Column(db.String(20), nullable=False)  # 'regular', 'sign_language'
    
    # Sign language specific data
    detected_sign = db.Column(db.Integer, nullable=True)  # The sign number detected (1-11)
    confidence_score = db.Column(db.Float, nullable=True)  # Model confidence
    sign_image_path = db.Column(db.String(255), nullable=True)  # Stored sign image for audit
    
    # Blockchain integration (for future)
    transaction_hash = db.Column(db.String(66), nullable=True, unique=True)
    block_number = db.Column(db.Integer, nullable=True)
    
    # Metadata
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'voter_id': self.voter_id,
            'candidate_id': self.candidate_id,
            'vote_method': self.vote_method,
            'detected_sign': self.detected_sign,
            'confidence_score': self.confidence_score,
            'transaction_hash': self.transaction_hash,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }