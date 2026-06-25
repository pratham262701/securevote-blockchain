"""
Voice Voting Routes
API endpoints for voice-based voting
"""

from flask import Blueprint, request, jsonify
from models.voter import db, Voter, AuditLog
from models.voting import Candidate, Vote
from utils.voice_recognition_service import voice_recognizer
from datetime import datetime

voice_bp = Blueprint('voice', __name__)


@voice_bp.route('/recognize', methods=['POST'])
def recognize_voice():
    """
    Recognize voice from audio file and match to candidate
    Expected: multipart/form-data with 'audio' file
    """
    try:
        # Check if audio is in request
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400

        file = request.files['audio']

        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        # Validate file type (common audio formats)
        allowed_extensions = {'wav', 'mp3', 'ogg', 'webm', 'm4a', 'flac'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: wav, mp3, ogg, webm, m4a, flac'
            }), 400

        # Read audio bytes
        audio_bytes = file.read()

        # Recognize speech
        spoken_text, confidence, error = voice_recognizer.recognize_speech_from_bytes(audio_bytes)

        if error:
            return jsonify({
                'success': False,
                'error': error,
                'spoken_text': spoken_text,
                'confidence': confidence
            }), 400

        # Get all active candidates
        candidates = Candidate.query.filter_by(is_active=True).all()
        candidate_names = [c.name for c in candidates]

        # Match spoken text to candidate name (lower threshold for better matching)
        matched_name, similarity, match_error = voice_recognizer.match_candidate_name(
            spoken_text,
            candidate_names,
            threshold=0.4  # More lenient threshold
        )

        if match_error:
            return jsonify({
                'success': False,
                'error': match_error,
                'spoken_text': spoken_text,
                'confidence': confidence
            }), 400

        # Find the matched candidate
        candidate = next((c for c in candidates if c.name == matched_name), None)

        if not candidate:
            return jsonify({
                'success': False,
                'error': f'Candidate "{matched_name}" not found'
            }), 404

        return jsonify({
            'success': True,
            'spoken_text': spoken_text,
            'speech_confidence': confidence,
            'matched_candidate': candidate.to_dict(),
            'match_confidence': similarity,
            'overall_confidence': (confidence + similarity) / 2
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Voice recognition failed: {str(e)}'
        }), 500


@voice_bp.route('/vote', methods=['POST'])
def cast_vote_with_voice():
    """
    Cast vote using voice recognition
    Expected: multipart/form-data with 'audio' file and 'wallet_address'
    """
    try:
        # Check if audio is in request
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
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
                action='attempted_double_vote_voice',
                ip_address=request.remote_addr,
                user_agent=request.user_agent.string,
                status='failure',
                details='Voter attempted to vote again using voice'
            )
            db.session.add(audit_log)
            db.session.commit()

            return jsonify({
                'success': False,
                'error': 'You have already cast your vote'
            }), 403

        file = request.files['audio']

        # Validate file
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400

        allowed_extensions = {'wav', 'mp3', 'ogg', 'webm', 'm4a', 'flac'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({
                'success': False,
                'error': 'Invalid file type. Allowed: wav, mp3, ogg, webm, m4a, flac'
            }), 400

        # Read audio bytes
        audio_bytes = file.read()

        # Recognize speech
        spoken_text, speech_confidence, error = voice_recognizer.recognize_speech_from_bytes(audio_bytes)

        if error:
            return jsonify({
                'success': False,
                'error': error
            }), 400

        # Get all active candidates
        candidates = Candidate.query.filter_by(is_active=True).all()
        candidate_names = [c.name for c in candidates]

        # Match spoken text to candidate name (lower threshold for better matching)
        matched_name, match_confidence, match_error = voice_recognizer.match_candidate_name(
            spoken_text,
            candidate_names,
            threshold=0.4  # More lenient threshold
        )

        if match_error:
            return jsonify({
                'success': False,
                'error': match_error,
                'spoken_text': spoken_text
            }), 400

        # Calculate overall confidence
        overall_confidence = (speech_confidence + match_confidence) / 2

        # Require at least 60% overall confidence
        if overall_confidence < 0.6:
            return jsonify({
                'success': False,
                'error': f'Low confidence ({overall_confidence*100:.1f}%). Please speak clearly and try again.',
                'spoken_text': spoken_text,
                'matched_candidate': matched_name,
                'confidence': overall_confidence
            }), 400

        # Find the matched candidate
        candidate = next((c for c in candidates if c.name == matched_name), None)

        if not candidate:
            return jsonify({
                'success': False,
                'error': f'Candidate "{matched_name}" not found'
            }), 404

        # Create vote record
        vote = Vote(
            voter_id=voter.id,
            candidate_id=candidate.id,
            vote_method='voice',
            detected_sign=None,  # Not applicable for voice
            confidence_score=overall_confidence,
            sign_image_path=None,  # Could store audio path if needed
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
            action='vote_cast_voice',
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
            status='success',
            details=f'Vote cast for candidate {candidate.name} using voice (Spoken: "{spoken_text}", Confidence: {overall_confidence*100:.1f}%)'
        )

        # Commit all changes
        db.session.add(vote)
        db.session.add(audit_log)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Vote cast successfully using voice!',
            'vote': {
                'candidate': candidate.to_dict(),
                'spoken_text': spoken_text,
                'confidence': overall_confidence,
                'speech_confidence': speech_confidence,
                'match_confidence': match_confidence,
                'vote_method': 'voice',
                'timestamp': vote.created_at.isoformat()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to cast vote: {str(e)}'
        }), 500


@voice_bp.route('/candidates', methods=['GET'])
def get_candidates_for_voice():
    """Get all active candidates for voice voting"""
    try:
        candidates = Candidate.query.filter_by(is_active=True).order_by(Candidate.id).all()

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
