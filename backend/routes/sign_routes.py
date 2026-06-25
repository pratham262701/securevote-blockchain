from flask import Blueprint, request, jsonify
from models.voter import db, Voter, AuditLog
from models.voting import Candidate, Vote
from utils.sign_detection_service import sign_detector
from datetime import datetime
import os

sign_bp = Blueprint('sign', __name__)

# ============================================================================
# CANDIDATE ENDPOINTS
# ============================================================================

@sign_bp.route('/candidates', methods=['GET'])
def get_candidates():
    """Get all active candidates with their sign numbers"""
    try:
        candidates = Candidate.query.filter_by(is_active=True).order_by(Candidate.sign_number).all()
        
        return jsonify({
            'success': True,
            'candidates': [c.to_dict() for c in candidates],
            'total': len(candidates)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@sign_bp.route('/candidates/<int:sign_number>', methods=['GET'])
def get_candidate_by_sign(sign_number):
    """Get candidate by sign number"""
    try:
        candidate = Candidate.query.filter_by(sign_number=sign_number, is_active=True).first()
        
        if not candidate:
            return jsonify({
                'success': False,
                'error': f'No candidate found for sign number {sign_number}'
            }), 404
        
        return jsonify({
            'success': True,
            'candidate': candidate.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ============================================================================
# SIGN DETECTION ENDPOINT
# ============================================================================

@sign_bp.route('/detect', methods=['POST'])
def detect_sign():
    """
    Detect sign from uploaded image
    Expected: multipart/form-data with 'image' file
    """
    try:
        print(f"[DEBUG] Request files: {request.files}")
        print(f"[DEBUG] Request form: {request.form}")
        print(f"[DEBUG] Request content type: {request.content_type}")

        # Check if image is in request
        if 'image' not in request.files:
            print("[DEBUG] No 'image' in request.files")
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        file = request.files['image']
        print(f"[DEBUG] File received: {file.filename}")

        if file.filename == '':
            print("[DEBUG] Empty filename")
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            print(f"[DEBUG] Invalid file type: {file.filename}")
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: png, jpg, jpeg'
            }), 400

        # Detect sign from image bytes
        image_bytes = file.read()
        print(f"[DEBUG] Image bytes read: {len(image_bytes)} bytes")
        detected_sign, confidence, error = sign_detector.detect_sign_from_bytes(image_bytes)
        print(f"[DEBUG] Detection result: sign={detected_sign}, confidence={confidence}, error={error}")

        if error:
            print(f"[DEBUG] Sign detection error: {error}")
            return jsonify({
                'success': False,
                'error': error
            }), 400
        
        # Get total number of candidates
        total_candidates = Candidate.query.filter_by(is_active=True).count()
        print(f"[DEBUG] Total active candidates: {total_candidates}")

        # Validate sign range
        is_valid, validation_error = sign_detector.validate_sign_for_candidates(
            detected_sign, total_candidates
        )
        print(f"[DEBUG] Validation result: is_valid={is_valid}, error={validation_error}")

        if not is_valid:
            print(f"[DEBUG] Validation failed - returning 400")
            return jsonify({
                'success': False,
                'error': validation_error,
                'detected_sign': detected_sign,
                'confidence': confidence
            }), 400

        # Get candidate info
        candidate = Candidate.query.filter_by(sign_number=detected_sign, is_active=True).first()
        print(f"[DEBUG] Candidate found: {candidate is not None}")

        return jsonify({
            'success': True,
            'detected_sign': detected_sign,
            'confidence': confidence,
            'candidate': candidate.to_dict() if candidate else None
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Detection failed: {str(e)}'
        }), 500


# ============================================================================
# VOTE CASTING ENDPOINT
# ============================================================================

@sign_bp.route('/vote', methods=['POST'])
def cast_vote_with_sign():
    """
    Cast vote using sign language
    Expected: multipart/form-data with 'image' file and 'wallet_address'
    """
    try:
        # Check if image is in request
        if 'image' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No image file provided'
            }), 400
        
        # Get voter wallet address
        wallet_address = request.form.get('wallet_address')
        if not wallet_address:
            return jsonify({
                'success': False,
                'error': 'Wallet address required'
            }), 400

        # Verify voter exists and is verified
        voter = Voter.query.filter_by(wallet_address=wallet_address.lower()).first()
        if not voter:
            return jsonify({
                'success': False,
                'error': 'Voter not found'
            }), 404
        
        if not voter.is_verified:
            return jsonify({
                'success': False,
                'error': 'Voter not verified. Please complete verification first.'
            }), 403
        
        # Check if voter has already voted
        if voter.has_voted:
            # Log suspicious activity
            audit_log = AuditLog(
                voter_id=voter.id,
                action='attempted_double_vote_sign',
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string,
                status='failure',
                details='Voter attempted to vote again using sign language'
            )
            db.session.add(audit_log)
            db.session.commit()
            
            return jsonify({
                'success': False,
                'error': 'You have already cast your vote'
            }), 403
        
        file = request.files['image']
        
        # Validate file
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        allowed_extensions = {'png', 'jpg', 'jpeg'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: png, jpg, jpeg'
            }), 400
        
        # Save uploaded image for audit trail
        image_path, save_error = sign_detector.save_uploaded_image(file)
        if save_error:
            return jsonify({
                'success': False,
                'error': save_error
            }), 500
        
        # Detect sign
        detected_sign, confidence, detection_error = sign_detector.detect_sign(image_path)
        
        if detection_error:
            return jsonify({
                'success': False,
                'error': detection_error
            }), 400
        
        # Validate confidence threshold (at least 70%)
        if confidence < 0.50:
            return jsonify({
                'success': False,
                'error': f'Low confidence detection ({confidence*100:.1f}%). Please try again with a clearer image.',
                'detected_sign': detected_sign,
                'confidence': confidence
            }), 400
        
        # Get total candidates
        total_candidates = Candidate.query.filter_by(is_active=True).count()
        
        # Validate sign range
        is_valid, validation_error = sign_detector.validate_sign_for_candidates(
            detected_sign, total_candidates
        )
        
        if not is_valid:
            return jsonify({
                'success': False,
                'error': validation_error,
                'detected_sign': detected_sign,
                'confidence': confidence
            }), 400
        
        # Get candidate
        candidate = Candidate.query.filter_by(sign_number=detected_sign, is_active=True).first()
        
        if not candidate:
            return jsonify({
                'success': False,
                'error': f'No candidate found for sign number {detected_sign}'
            }), 404
        
        # Create vote record
        vote = Vote(
            voter_id=voter.id,
            candidate_id=candidate.id,
            vote_method='sign_language',
            detected_sign=detected_sign,
            confidence_score=confidence,
            sign_image_path=image_path,
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string
        )
        
        # Update voter status
        voter.has_voted = True
        
        # Update candidate vote count
        candidate.vote_count += 1
        
        # Create audit log
        audit_log = AuditLog(
            voter_id=voter.id,
            action='vote_cast_sign_language',
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
            status='success',
            details=f'Vote cast for candidate {candidate.name} using sign language (Sign: {detected_sign}, Confidence: {confidence*100:.1f}%)'
        )
        
        # Commit all changes
        db.session.add(vote)
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Vote cast successfully using sign language!',
            'vote': {
                'candidate': candidate.to_dict(),
                'detected_sign': detected_sign,
                'confidence': confidence,
                'vote_method': 'sign_language',
                'timestamp': vote.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to cast vote: {str(e)}'
        }), 500


# ============================================================================
# VOTING STATISTICS
# ============================================================================

@sign_bp.route('/stats', methods=['GET'])
def get_voting_stats():
    """Get voting statistics including sign language votes"""
    try:
        total_votes = Vote.query.count()
        sign_language_votes = Vote.query.filter_by(vote_method='sign_language').count()
        regular_votes = Vote.query.filter_by(vote_method='regular').count()
        
        # Votes per candidate
        candidates = Candidate.query.filter_by(is_active=True).all()
        candidate_stats = []
        
        for candidate in candidates:
            sign_votes = Vote.query.filter_by(
                candidate_id=candidate.id, 
                vote_method='sign_language'
            ).count()
            
            candidate_stats.append({
                'candidate': candidate.to_dict(),
                'total_votes': candidate.vote_count,
                'sign_language_votes': sign_votes
            })
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_votes': total_votes,
                'sign_language_votes': sign_language_votes,
                'regular_votes': regular_votes,
                'candidates': candidate_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500