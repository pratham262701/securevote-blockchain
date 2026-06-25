"""
Blockchain Sync Routes
API endpoints to sync data between blockchain and database
"""

from flask import Blueprint, request, jsonify
from models.voter import db
from models.voting import Candidate
from web3 import Web3
import json
import os

sync_bp = Blueprint('sync', __name__)

# Load contract ABI and address from environment or config
def get_web3_contract():
    """Initialize Web3 and contract instance"""
    try:
        # Connect to blockchain (Ganache or other provider)
        web3_provider = os.getenv('WEB3_PROVIDER', 'http://127.0.0.1:7545')
        web3 = Web3(Web3.HTTPProvider(web3_provider))

        if not web3.is_connected():
            return None, None, "Cannot connect to blockchain"

        # Load contract ABI
        abi_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'frontend', 'src', 'abi', 'Voting.json'
        )

        if not os.path.exists(abi_path):
            return None, None, f"Contract ABI not found at {abi_path}"

        with open(abi_path, 'r') as f:
            contract_json = json.load(f)
            contract_abi = contract_json.get('abi', contract_json)

        # Get contract address from environment
        contract_address = os.getenv('CONTRACT_ADDRESS')
        if not contract_address:
            return None, None, "CONTRACT_ADDRESS not set in environment"

        # Create contract instance
        contract = web3.eth.contract(
            address=Web3.to_checksum_address(contract_address),
            abi=contract_abi
        )

        return web3, contract, None

    except Exception as e:
        return None, None, f"Error initializing Web3: {str(e)}"


@sync_bp.route('/candidates', methods=['POST'])
def sync_candidates():
    """
    Sync candidates from blockchain to database
    This should be called after adding candidates via admin panel
    """
    try:
        web3, contract, error = get_web3_contract()
        if error:
            return jsonify({
                'success': False,
                'error': error,
                'message': 'Blockchain connection failed. Using database candidates only.'
            }), 500

        # Get candidate count from blockchain
        candidate_count = contract.functions.candidateCount().call()

        if candidate_count == 0:
            return jsonify({
                'success': False,
                'error': 'No candidates found in blockchain'
            }), 404

        # Clear existing candidates or update them
        clear_existing = request.json.get('clear_existing', False)
        if clear_existing:
            Candidate.query.delete()
            db.session.commit()

        # Fetch candidates from blockchain
        synced_count = 0
        updated_count = 0

        for i in range(1, candidate_count + 1):
            blockchain_candidate = contract.functions.candidates(i).call()
            candidate_id = int(blockchain_candidate[0])
            candidate_name = blockchain_candidate[1]
            candidate_votes = int(blockchain_candidate[2])

            # Check if candidate exists in database
            db_candidate = Candidate.query.filter_by(sign_number=candidate_id).first()

            if db_candidate:
                # Update existing candidate
                db_candidate.name = candidate_name
                db_candidate.vote_count = candidate_votes
                updated_count += 1
            else:
                # Add new candidate
                new_candidate = Candidate(
                    name=candidate_name,
                    party=f'Party {candidate_id}',  # Default party name
                    sign_number=candidate_id,
                    is_active=True,
                    vote_count=candidate_votes
                )
                db.session.add(new_candidate)
                synced_count += 1

        db.session.commit()

        # Get all candidates for response
        all_candidates = Candidate.query.order_by(Candidate.sign_number).all()

        return jsonify({
            'success': True,
            'message': f'Synced {synced_count} new candidates, updated {updated_count} existing',
            'candidates': [c.to_dict() for c in all_candidates],
            'total': len(all_candidates)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Sync failed: {str(e)}'
        }), 500


@sync_bp.route('/status', methods=['GET'])
def sync_status():
    """
    Check sync status between blockchain and database
    """
    try:
        web3, contract, error = get_web3_contract()

        # Get database candidates
        db_candidates = Candidate.query.order_by(Candidate.sign_number).all()
        db_count = len(db_candidates)

        response = {
            'database': {
                'count': db_count,
                'candidates': [{'id': c.sign_number, 'name': c.name} for c in db_candidates]
            }
        }

        if error:
            response['blockchain'] = {
                'connected': False,
                'error': error
            }
            response['in_sync'] = False
        else:
            # Get blockchain candidates
            blockchain_count = contract.functions.candidateCount().call()
            blockchain_candidates = []

            for i in range(1, blockchain_count + 1):
                bc_candidate = contract.functions.candidates(i).call()
                blockchain_candidates.append({
                    'id': int(bc_candidate[0]),
                    'name': bc_candidate[1],
                    'votes': int(bc_candidate[2])
                })

            response['blockchain'] = {
                'connected': True,
                'count': blockchain_count,
                'candidates': blockchain_candidates
            }

            # Check if in sync
            response['in_sync'] = (
                db_count == blockchain_count and
                all(
                    db_c.name == bc_c['name']
                    for db_c, bc_c in zip(db_candidates, blockchain_candidates)
                )
            )

        return jsonify(response), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
