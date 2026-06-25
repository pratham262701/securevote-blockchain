import random
import string
from datetime import datetime, timedelta
from models.voter import db, OTP
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def generate_otp(length=6):
    """Generate a random OTP"""
    return ''.join(random.choices(string.digits, k=length))


def create_otp(voter_id, otp_type='email', expiry_minutes=5):
    """Create and store OTP for a voter"""
    otp_code = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=expiry_minutes)

    print(f"[DEBUG] Creating OTP for voter_id={voter_id}, otp_code='{otp_code}', expires_at={expires_at}")

    # Delete ALL previous OTPs for this voter and type (both used and unused)
    # This ensures only the latest OTP is valid and prevents confusion
    deleted = OTP.query.filter_by(
        voter_id=voter_id,
        otp_type=otp_type
    ).delete()
    db.session.commit()
    print(f"[DEBUG] Deleted {deleted} previous OTPs")

    # Create new OTP
    otp = OTP(
        voter_id=voter_id,
        otp_code=otp_code,
        otp_type=otp_type,
        expires_at=expires_at
    )
    db.session.add(otp)
    db.session.commit()

    print(f"[DEBUG] OTP created successfully with ID: {otp.id}")
    return otp


def verify_otp(voter_id, otp_code, otp_type='email'):
    """Verify OTP for a voter"""
    # Strip whitespace from OTP code
    otp_code = str(otp_code).strip()

    print(f"[DEBUG] Verifying OTP for voter_id={voter_id}, otp_code='{otp_code}', otp_type='{otp_type}'")

    # Get all OTPs for this voter to debug
    all_otps = OTP.query.filter_by(voter_id=voter_id, otp_type=otp_type).all()
    print(f"[DEBUG] Found {len(all_otps)} total OTPs for this voter")
    for o in all_otps:
        print(f"  - OTP: '{o.otp_code}', is_used={o.is_used}, is_valid={o.is_valid}, expired={o.is_expired()}")

    otp = OTP.query.filter_by(
        voter_id=voter_id,
        otp_code=otp_code,
        otp_type=otp_type,
        is_used=False,
        is_valid=True
    ).first()

    if not otp:
        print(f"[DEBUG] No matching OTP found in database")
        return False, "Invalid OTP"

    if otp.is_expired():
        print(f"[DEBUG] OTP has expired. Expires at: {otp.expires_at}, Current time: {datetime.utcnow()}")
        otp.is_valid = False
        db.session.commit()
        return False, "OTP has expired"

    # Mark OTP as used
    print(f"[DEBUG] OTP verified successfully!")
    otp.is_used = True
    otp.used_at = datetime.utcnow()
    db.session.commit()

    return True, "OTP verified successfully"


def send_otp_email(to_email, otp_code, name, smtp_config):
    """Send OTP via email"""
    try:
        if not smtp_config.get('user') or not smtp_config.get('password'):
            print(f"[DEV MODE] OTP for {name}: {otp_code}")
            return True

        msg = MIMEMultipart()
        msg['From'] = smtp_config['user']
        msg['To'] = to_email
        msg['Subject'] = "Your Voting System OTP"

        body = f"""
        <html>
        <body>
            <h2>Secure E-Voting System</h2>
            <p>Dear {name},</p>
            <p>Your One-Time Password (OTP) for authentication is:</p>
            <h1 style="color: #2563eb; letter-spacing: 5px;">{otp_code}</h1>
            <p>This OTP will expire in 5 minutes.</p>
            <p><strong>Do not share this OTP with anyone.</strong></p>
            <br>
            <p>If you did not request this OTP, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
                Secure Blockchain-Based Voting System<br>
                Contact: {smtp_config.get('user')}
            </p>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
            server.starttls()
            server.login(smtp_config['user'], smtp_config['password'])
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        # In development, print OTP to console
        print(f"[DEV MODE] OTP for {name} ({to_email}): {otp_code}")
        return True  # Return True in dev mode


def send_otp_sms(phone_number, otp_code, name):
    """Send OTP via SMS (mock implementation - integrate Twilio/AWS SNS in production)"""
    # TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    print(f"[SMS] OTP for {name} ({phone_number}): {otp_code}")
    return True
