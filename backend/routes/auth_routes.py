from flask import Blueprint, request, jsonify
from models.voter import db, Voter, BiometricData
from utils.aadhaar_service import validate_aadhaar_number, mock_aadhaar_api_verification, validate_voter_id
from utils.otp_service import create_otp, verify_otp, send_otp_email, send_otp_sms
from utils.face_recognition_service import process_face_registration, process_face_verification
from utils.security_service import log_action, check_rate_limit, increment_failed_login, reset_failed_login, is_account_locked
from utils.aadhaar_photo_verification import aadhaar_photo_verifier
import jwt
from datetime import datetime, timedelta
import os

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register_voter():
    """Register new voter with Aadhaar and basic info"""
    try:
        data = request.json

        wallet_address = data.get('wallet_address', '').lower()
        aadhaar_number = data.get('aadhaar_number', '')
        voter_id = data.get('voter_id', '')
        name = data.get('name', '')
        email = data.get('email', '')
        phone = data.get('phone', '')

        # Validation
        if not wallet_address or not aadhaar_number or not name:
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate Aadhaar
        aadhaar_valid, aadhaar_result = validate_aadhaar_number(aadhaar_number)
        if not aadhaar_valid:
            log_action(None, 'register_attempt', 'failure', aadhaar_result)
            return jsonify({'error': aadhaar_result}), 400

        aadhaar_clean = aadhaar_result

        # Validate Voter ID if provided
        if voter_id:
            voter_id_valid, voter_id_result = validate_voter_id(voter_id)
            if not voter_id_valid:
                return jsonify({'error': voter_id_result}), 400
            voter_id = voter_id_result

        # Check if wallet already registered
        existing_voter = Voter.query.filter_by(wallet_address=wallet_address).first()
        if existing_voter:
            return jsonify({'error': 'Wallet address already registered'}), 400

        # Check if Aadhaar already registered
        existing_aadhaar = Voter.query.filter_by(aadhaar_number=aadhaar_clean).first()
        if existing_aadhaar:
            return jsonify({'error': 'Aadhaar number already registered'}), 400

        # Verify Aadhaar with mock API
        verification_result = mock_aadhaar_api_verification(aadhaar_clean, name)
        if not verification_result['verified']:
            log_action(None, 'register_aadhaar_verify', 'failure', verification_result['message'])
            return jsonify({'error': verification_result['message']}), 400

        # Create new voter
        voter = Voter(
            wallet_address=wallet_address,
            aadhaar_number=aadhaar_clean,
            voter_id=voter_id if voter_id else None,
            name=name,
            email=email,
            phone=phone,
            is_registered=True,
            is_verified=False
        )

        db.session.add(voter)
        db.session.commit()

        log_action(voter.id, 'register', 'success', 'Voter registered successfully')

        return jsonify({
            'success': True,
            'message': 'Registration successful. Please complete face verification.',
            'voter': voter.to_dict(),
            'aadhaar_verification': verification_result
        }), 201

    except Exception as e:
        db.session.rollback()
        log_action(None, 'register', 'failure', str(e))
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/register-face', methods=['POST'])
def register_face():
    """Register voter's face for biometric authentication"""
    try:
        data = request.json

        wallet_address = data.get('wallet_address', '').lower()
        face_image_base64 = data.get('face_image')
        aadhaar_image_base64 = data.get('aadhaar_image')  # Optional - for saving Aadhaar during registration

        print(f"[DEBUG] register-face called for wallet: {wallet_address}")
        print(f"[DEBUG] face_image length: {len(face_image_base64) if face_image_base64 else 0}")
        print(f"[DEBUG] aadhaar_image provided: {bool(aadhaar_image_base64)}")

        if not wallet_address:
            return jsonify({'error': 'Missing wallet address'}), 400

        if not face_image_base64:
            return jsonify({'error': 'Missing face image'}), 400

        # Validate image format
        if not face_image_base64.startswith('data:image'):
            return jsonify({'error': 'Invalid image format. Expected data URL'}), 400

        if len(face_image_base64) < 1000:
            return jsonify({'error': 'Image too small or corrupted'}), 400

        # Find voter
        voter = Voter.query.filter_by(wallet_address=wallet_address).first()
        if not voter:
            return jsonify({'error': 'Voter not found. Please register first.'}), 404

        # Process face registration
        images_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'face_images')
        encoding_json, image_path, message = process_face_registration(
            face_image_base64,
            voter.id,
            images_dir
        )

        if encoding_json is None:
            log_action(voter.id, 'register_face', 'failure', message)
            return jsonify({'error': message}), 400

        # Save Aadhaar image if provided (during registration flow)
        aadhaar_path = None
        if aadhaar_image_base64:
            aadhaar_images_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'aadhaar_images')
            aadhaar_path, save_error = aadhaar_photo_verifier.save_aadhaar_image(
                aadhaar_image_base64,
                voter.id,
                aadhaar_images_dir
            )
            if save_error:
                print(f"Warning: Failed to save Aadhaar image: {save_error}")

        # Save biometric data
        biometric = BiometricData.query.filter_by(voter_id=voter.id).first()
        if biometric:
            biometric.face_encoding = encoding_json
            biometric.face_image_path = image_path
            if aadhaar_path:
                biometric.aadhaar_image_path = aadhaar_path
                biometric.aadhaar_verified = True
            biometric.updated_at = datetime.utcnow()
        else:
            biometric = BiometricData(
                voter_id=voter.id,
                face_encoding=encoding_json,
                face_image_path=image_path,
                aadhaar_image_path=aadhaar_path,
                aadhaar_verified=True if aadhaar_path else False
            )
            db.session.add(biometric)

        voter.is_verified = True
        db.session.commit()

        log_action(voter.id, 'register_face', 'success', 'Face registered successfully')

        return jsonify({
            'success': True,
            'message': message,
            'voter': voter.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        log_action(None, 'register_face', 'failure', str(e))
        return jsonify({'error': f'Face registration failed: {str(e)}'}), 500


@auth_bp.route('/verify-aadhaar-photo', methods=['POST'])
def verify_aadhaar_photo():
    """Verify Aadhaar card photo matches with user's selfie"""
    try:
        data = request.json

        wallet_address = data.get('wallet_address', '').lower()
        aadhaar_image_base64 = data.get('aadhaar_image')
        selfie_base64 = data.get('selfie_image')

        if not aadhaar_image_base64 or not selfie_base64:
            return jsonify({'error': 'Missing required fields'}), 400

        # Verify Aadhaar photo with selfie (works without voter existing)
        is_verified, confidence, message = aadhaar_photo_verifier.verify_aadhaar_with_selfie(
            aadhaar_image_base64,
            selfie_base64
        )

        if not is_verified:
            # Log failure if voter exists
            voter = Voter.query.filter_by(wallet_address=wallet_address).first() if wallet_address else None
            if voter:
                log_action(voter.id, 'aadhaar_photo_verify', 'failure', message)

            return jsonify({
                'success': False,
                'error': message,
                'confidence': confidence
            }), 400

        # If verification succeeded and voter exists, save the data
        if wallet_address:
            voter = Voter.query.filter_by(wallet_address=wallet_address).first()
            if voter:
                # Save Aadhaar image
                aadhaar_images_dir = os.path.join(os.path.dirname(__file__), '..', 'static', 'aadhaar_images')
                aadhaar_path, save_error = aadhaar_photo_verifier.save_aadhaar_image(
                    aadhaar_image_base64,
                    voter.id,
                    aadhaar_images_dir
                )

                if not save_error:
                    # Update biometric data
                    biometric = BiometricData.query.filter_by(voter_id=voter.id).first()
                    if biometric:
                        biometric.aadhaar_image_path = aadhaar_path
                        biometric.aadhaar_verified = True
                        biometric.updated_at = datetime.utcnow()
                    else:
                        biometric = BiometricData(
                            voter_id=voter.id,
                            aadhaar_image_path=aadhaar_path,
                            aadhaar_verified=True
                        )
                        db.session.add(biometric)

                    db.session.commit()
                    log_action(voter.id, 'aadhaar_photo_verify', 'success', message)

        # Return success even if voter doesn't exist yet (for pre-registration verification)
        return jsonify({
            'success': True,
            'message': message,
            'confidence': confidence
        }), 200

    except Exception as e:
        db.session.rollback()
        log_action(None, 'aadhaar_photo_verify', 'failure', str(e))
        return jsonify({'error': f'Aadhaar photo verification failed: {str(e)}'}), 500


@auth_bp.route('/login/request-otp', methods=['POST'])
def request_otp():
    """Request OTP for voter authentication"""
    try:
        data = request.json

        wallet_address = data.get('wallet_address', '').lower()
        otp_type = data.get('otp_type', 'email')  # 'email' or 'sms'

        if not wallet_address:
            return jsonify({'error': 'Wallet address required'}), 400

        # Find voter
        voter = Voter.query.filter_by(wallet_address=wallet_address).first()
        if not voter:
            log_action(None, 'request_otp', 'failure', 'Voter not found')
            return jsonify({'error': 'Voter not registered'}), 404

        # Check if account is locked
        is_locked, lock_message = is_account_locked(voter.id)
        if is_locked:
            return jsonify({'error': lock_message}), 403

        # Rate limiting
        can_proceed, rate_message = check_rate_limit(voter.id, 'request_otp', max_attempts=5, time_window_minutes=15)
        if not can_proceed:
            return jsonify({'error': rate_message}), 429

        # Create OTP
        from config import Config
        otp = create_otp(voter.id, otp_type, Config.OTP_EXPIRY_MINUTES)

        # Send OTP
        smtp_config = {
            'host': Config.SMTP_HOST,
            'port': Config.SMTP_PORT,
            'user': Config.SMTP_USER,
            'password': Config.SMTP_PASSWORD
        }

        if otp_type == 'email' and voter.email:
            send_otp_email(voter.email, otp.otp_code, voter.name, smtp_config)
        elif otp_type == 'sms' and voter.phone:
            send_otp_sms(voter.phone, otp.otp_code, voter.name)
        else:
            # Default to console output in dev mode
            print(f"[DEV] OTP for {voter.name} ({wallet_address}): {otp.otp_code}")

        log_action(voter.id, 'request_otp', 'success', f'OTP sent via {otp_type}')

        return jsonify({
            'success': True,
            'message': f'OTP sent to your {otp_type}',
            'expires_in_minutes': Config.OTP_EXPIRY_MINUTES
        }), 200

    except Exception as e:
        log_action(None, 'request_otp', 'failure', str(e))
        return jsonify({'error': f'Failed to send OTP: {str(e)}'}), 500


@auth_bp.route('/login/verify', methods=['POST'])
def verify_login():
    """Verify OTP and face for complete authentication"""
    try:
        data = request.json

        wallet_address = data.get('wallet_address', '').lower()
        otp_code = data.get('otp_code', '')
        face_image_base64 = data.get('face_image')
        aadhaar_image_base64 = data.get('aadhaar_image')

        print(f"[DEBUG] Login verify request - wallet: {wallet_address}, otp: '{otp_code}' (len={len(otp_code)})")

        if not wallet_address or not otp_code:
            return jsonify({'error': 'Missing required fields'}), 400

        # Find voter
        voter = Voter.query.filter_by(wallet_address=wallet_address).first()
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404

        print(f"[DEBUG] Found voter - ID: {voter.id}, Name: {voter.name}")

        # Check if account is locked
        is_locked, lock_message = is_account_locked(voter.id)
        if is_locked:
            return jsonify({'error': lock_message}), 403

        # Verify OTP
        print(f"[DEBUG] About to verify OTP...")
        otp_valid, otp_message = verify_otp(voter.id, otp_code, 'email')
        if not otp_valid:
            increment_failed_login(voter.id)
            log_action(voter.id, 'login_verify', 'failure', otp_message)
            return jsonify({'error': otp_message}), 401

        # Verify face if provided
        face_verified = False
        face_confidence = 0

        if face_image_base64:
            biometric = BiometricData.query.filter_by(voter_id=voter.id).first()
            if not biometric or not biometric.face_encoding:
                return jsonify({'error': 'No face data registered. Please register face first.'}), 400

            from config import Config
            is_match, confidence, face_message = process_face_verification(
                face_image_base64,
                biometric.face_encoding,
                Config.FACE_RECOGNITION_TOLERANCE
            )

            if not is_match:
                increment_failed_login(voter.id)
                log_action(voter.id, 'login_face_verify', 'failure', face_message)
                return jsonify({'error': f'Face verification failed: {face_message}'}), 401

            face_verified = True
            face_confidence = confidence

        # Verify Aadhaar photo if provided
        aadhaar_verified = False
        aadhaar_confidence = 0

        if aadhaar_image_base64:
            biometric = BiometricData.query.filter_by(voter_id=voter.id).first()
            if not biometric or not biometric.aadhaar_image_path:
                return jsonify({'error': 'No Aadhaar data registered. Please complete registration.'}), 400

            # Read the stored Aadhaar image
            try:
                with open(biometric.aadhaar_image_path, 'rb') as f:
                    import base64
                    stored_aadhaar_base64 = 'data:image/jpeg;base64,' + base64.b64encode(f.read()).decode()
            except Exception as e:
                return jsonify({'error': 'Failed to read stored Aadhaar image'}), 500

            # Extract faces and compare
            stored_encoding, _ = aadhaar_photo_verifier.extract_face_from_aadhaar(stored_aadhaar_base64)
            current_encoding, _ = aadhaar_photo_verifier.extract_face_from_aadhaar(aadhaar_image_base64)

            if stored_encoding is None or current_encoding is None:
                increment_failed_login(voter.id)
                log_action(voter.id, 'login_aadhaar_verify', 'failure', 'Could not extract face from Aadhaar')
                return jsonify({'error': 'Could not verify Aadhaar photo. Please try again.'}), 401

            is_match, confidence, _ = aadhaar_photo_verifier.compare_faces(stored_encoding, current_encoding)

            if not is_match:
                increment_failed_login(voter.id)
                log_action(voter.id, 'login_aadhaar_verify', 'failure', 'Aadhaar photo does not match')
                return jsonify({'error': 'Aadhaar photo verification failed. The photo does not match.'}), 401

            aadhaar_verified = True
            aadhaar_confidence = confidence

        # Authentication successful
        reset_failed_login(voter.id)
        log_action(voter.id, 'login', 'success', 'User authenticated successfully')

        # Generate JWT token
        from config import Config
        token = jwt.encode({
            'voter_id': voter.id,
            'wallet_address': voter.wallet_address,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, Config.JWT_SECRET_KEY, algorithm='HS256')

        return jsonify({
            'success': True,
            'message': 'Authentication successful',
            'token': token,
            'voter': voter.to_dict(),
            'face_verified': face_verified,
            'face_confidence': round(face_confidence, 2) if face_verified else 0,
            'aadhaar_verified': aadhaar_verified,
            'aadhaar_confidence': round(aadhaar_confidence, 2) if aadhaar_verified else 0
        }), 200

    except Exception as e:
        log_action(None, 'login_verify', 'failure', str(e))
        return jsonify({'error': f'Login verification failed: {str(e)}'}), 500


@auth_bp.route('/voter/<wallet_address>', methods=['GET'])
def get_voter_info(wallet_address):
    """Get voter information by wallet address"""
    try:
        wallet_address = wallet_address.lower()

        voter = Voter.query.filter_by(wallet_address=wallet_address).first()
        if not voter:
            return jsonify({'error': 'Voter not found'}), 404

        # Check for biometric data
        biometric = BiometricData.query.filter_by(voter_id=voter.id).first()

        return jsonify({
            'success': True,
            'voter': voter.to_dict(),
            'has_face_data': bool(biometric and biometric.face_encoding),
            'has_fingerprint': bool(biometric and biometric.fingerprint_hash)
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to get voter info: {str(e)}'}), 500
