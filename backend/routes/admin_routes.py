from flask import Blueprint, request, jsonify
from models.voter import db, Voter, AuditLog, AttackAlert
from utils.security_service import log_action
from functools import wraps
import jwt

admin_bp = Blueprint('admin', __name__)


def admin_required(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Authentication required'}), 401

        try:
            if token.startswith('Bearer '):
                token = token[7:]

            from config import Config
            data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])

            # Check if user is admin - comparing wallet addresses
            wallet_address = data.get('wallet_address', '').lower()  # Normalize to lowercase

            if not wallet_address:
                return jsonify({'error': 'Wallet address not found in token'}), 401

            # Verify wallet matches admin wallet from config
            if wallet_address != Config.ADMIN_WALLET:
                return jsonify({'error': 'Admin access denied. Not an admin account.'}), 403

            request.voter_id = data.get('voter_id')
            request.wallet_address = wallet_address

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated_function


@admin_bp.route('/voters', methods=['GET'])
@admin_required
def get_all_voters():
    """Get all registered voters"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        voters = Voter.query.order_by(Voter.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'success': True,
            'voters': [voter.to_dict() for voter in voters.items],
            'total': voters.total,
            'page': page,
            'per_page': per_page,
            'pages': voters.pages
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch voters: {str(e)}'}), 500


@admin_bp.route('/voters/stats', methods=['GET'])
@admin_required
def get_voter_stats():
    """Get voter statistics"""
    try:
        total_registered = Voter.query.count()
        total_verified = Voter.query.filter_by(is_verified=True).count()
        total_voted = Voter.query.filter_by(has_voted=True).count()
        total_pending = Voter.query.filter_by(is_verified=False).count()

        return jsonify({
            'success': True,
            'stats': {
                'total_registered': total_registered,
                'total_verified': total_verified,
                'total_voted': total_voted,
                'total_pending': total_pending,
                'voter_turnout': round((total_voted / total_registered * 100) if total_registered > 0 else 0, 2)
            }
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch stats: {str(e)}'}), 500


@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def get_audit_logs():
    """Get audit logs"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 100, type=int)
        action_filter = request.args.get('action')
        status_filter = request.args.get('status')

        query = AuditLog.query

        if action_filter:
            query = query.filter_by(action=action_filter)
        if status_filter:
            query = query.filter_by(status=status_filter)

        logs = query.order_by(AuditLog.timestamp.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs.items],
            'total': logs.total,
            'page': page,
            'per_page': per_page,
            'pages': logs.pages
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch audit logs: {str(e)}'}), 500


@admin_bp.route('/alerts', methods=['GET'])
@admin_required
def get_attack_alerts():
    """Get security attack alerts"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        severity_filter = request.args.get('severity')
        resolved_filter = request.args.get('resolved')

        query = AttackAlert.query

        if severity_filter:
            query = query.filter_by(severity=severity_filter)
        if resolved_filter is not None:
            query = query.filter_by(is_resolved=resolved_filter.lower() == 'true')

        alerts = query.order_by(AttackAlert.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'success': True,
            'alerts': [alert.to_dict() for alert in alerts.items],
            'total': alerts.total,
            'page': page,
            'per_page': per_page,
            'pages': alerts.pages
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch alerts: {str(e)}'}), 500


@admin_bp.route('/alerts/<int:alert_id>/resolve', methods=['POST'])
@admin_required
def resolve_alert(alert_id):
    """Mark attack alert as resolved"""
    try:
        alert = AttackAlert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404

        alert.is_resolved = True
        alert.resolved_at = datetime.utcnow()
        db.session.commit()

        log_action(request.voter_id, 'resolve_alert', 'success', f'Alert {alert_id} resolved')

        return jsonify({
            'success': True,
            'message': 'Alert resolved successfully',
            'alert': alert.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to resolve alert: {str(e)}'}), 500


@admin_bp.route('/voters/<int:voter_id>/unlock', methods=['POST'])
@admin_required
def unlock_voter_account(voter_id):
    """Unlock a locked voter account"""
    try:
        voter = Voter.query.get(voter_id)
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404

        voter.locked_until = None
        voter.failed_login_attempts = 0
        db.session.commit()

        log_action(request.voter_id, 'unlock_account', 'success', f'Unlocked voter {voter_id}')

        return jsonify({
            'success': True,
            'message': 'Account unlocked successfully',
            'voter': voter.to_dict()
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to unlock account: {str(e)}'}), 500


@admin_bp.route('/voters/<int:voter_id>', methods=['DELETE'])
@admin_required
def delete_voter(voter_id):
    """Delete a voter (admin only - use with caution)"""
    try:
        voter = Voter.query.get(voter_id)
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404

        if voter.has_voted:
            return jsonify({'error': 'Cannot delete voter who has already voted'}), 400

        db.session.delete(voter)
        db.session.commit()

        log_action(request.voter_id, 'delete_voter', 'success', f'Deleted voter {voter_id}')

        return jsonify({
            'success': True,
            'message': 'Voter deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete voter: {str(e)}'}), 500


from datetime import datetime
from models.voting import Vote, Candidate


@admin_bp.route('/votes', methods=['GET'])
@admin_required
def get_all_votes():
    """Get all votes with complete details"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)

        # Query votes with joins
        votes_query = db.session.query(
            Vote,
            Voter,
            Candidate
        ).join(
            Voter, Vote.voter_id == Voter.id
        ).join(
            Candidate, Vote.candidate_id == Candidate.id
        ).order_by(Vote.created_at.desc())

        # Paginate
        paginated = votes_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        votes_data = []
        for vote, voter, candidate in paginated.items:
            vote_info = {
                'id': vote.id,
                'timestamp': vote.created_at.isoformat() if vote.created_at else None,

                # Voter details
                'voter': {
                    'id': voter.id,
                    'name': voter.name,
                    'wallet_address': voter.wallet_address,
                    'aadhaar': voter.mask_aadhaar(),
                    'voter_id': voter.voter_id
                },

                # Candidate details
                'candidate': {
                    'id': candidate.id,
                    'name': candidate.name,
                    'party': candidate.party,
                    'sign_number': candidate.sign_number
                },

                # Vote method details
                'vote_method': vote.vote_method,
                'detected_sign': vote.detected_sign,
                'confidence_score': vote.confidence_score,

                # Technical details
                'ip_address': vote.ip_address,
                'user_agent': vote.user_agent,
                'transaction_hash': vote.transaction_hash,
                'block_number': vote.block_number
            }
            votes_data.append(vote_info)

        return jsonify({
            'success': True,
            'votes': votes_data,
            'total': paginated.total,
            'page': page,
            'per_page': per_page,
            'total_pages': paginated.pages
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch votes: {str(e)}'}), 500


@admin_bp.route('/votes/stats', methods=['GET'])
@admin_required
def get_vote_stats():
    """Get voting statistics"""
    try:
        total_votes = Vote.query.count()

        # Votes by method
        votes_by_method = db.session.query(
            Vote.vote_method,
            db.func.count(Vote.id)
        ).group_by(Vote.vote_method).all()

        # Votes by candidate
        votes_by_candidate = db.session.query(
            Candidate.name,
            db.func.count(Vote.id)
        ).join(Vote).group_by(Candidate.id, Candidate.name).all()

        # Average confidence score
        avg_confidence = db.session.query(
            db.func.avg(Vote.confidence_score)
        ).filter(Vote.confidence_score.isnot(None)).scalar()

        return jsonify({
            'success': True,
            'total_votes': total_votes,
            'votes_by_method': dict(votes_by_method),
            'votes_by_candidate': dict(votes_by_candidate),
            'average_confidence': float(avg_confidence) if avg_confidence else 0
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch vote stats: {str(e)}'}), 500
