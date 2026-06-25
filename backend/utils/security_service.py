from datetime import datetime, timedelta
from models.voter import db, Voter, AuditLog, AttackAlert
from flask import request
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def log_action(voter_id, action, status, details=None):
    """Log user action for audit trail"""
    try:
        ip_address = request.remote_addr if request else None
        user_agent = request.headers.get('User-Agent') if request else None

        audit_log = AuditLog(
            voter_id=voter_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            details=details
        )
        db.session.add(audit_log)
        db.session.commit()
        return True
    except Exception as e:
        print(f"Error logging action: {e}")
        return False


def check_rate_limit(voter_id, action, max_attempts=5, time_window_minutes=15):
    """Check if user has exceeded rate limit for an action"""
    try:
        time_threshold = datetime.utcnow() - timedelta(minutes=time_window_minutes)

        recent_attempts = AuditLog.query.filter(
            AuditLog.voter_id == voter_id,
            AuditLog.action == action,
            AuditLog.timestamp >= time_threshold
        ).count()

        if recent_attempts >= max_attempts:
            return False, f"Too many attempts. Please try again after {time_window_minutes} minutes"

        return True, "Rate limit OK"
    except Exception as e:
        print(f"Error checking rate limit: {e}")
        return True, "Rate limit check failed"


def detect_brute_force(voter_id, max_failed_attempts=20):
    """Detect brute force attempts"""
    try:
        voter = Voter.query.get(voter_id)
        if not voter:
            return False

        # Check if account is locked
        if voter.locked_until and voter.locked_until > datetime.utcnow():
            return True

        # Check failed login attempts
        if voter.failed_login_attempts >= max_failed_attempts:
            # Lock account for 30 minutes
            voter.locked_until = datetime.utcnow() + timedelta(minutes=30)
            db.session.commit()

            # Create attack alert
            create_attack_alert(
                alert_type='brute_force',
                severity='high',
                description=f'Brute force attack detected on voter ID {voter_id}',
                voter_id=voter_id
            )

            return True

        return False
    except Exception as e:
        print(f"Error detecting brute force: {e}")
        return False


def increment_failed_login(voter_id):
    """Increment failed login counter"""
    try:
        voter = Voter.query.get(voter_id)
        if voter:
            voter.failed_login_attempts += 1
            db.session.commit()

            # Check for brute force
            detect_brute_force(voter_id)
    except Exception as e:
        print(f"Error incrementing failed login: {e}")


def reset_failed_login(voter_id):
    """Reset failed login counter on successful login"""
    try:
        voter = Voter.query.get(voter_id)
        if voter:
            voter.failed_login_attempts = 0
            voter.locked_until = None
            voter.last_login = datetime.utcnow()
            db.session.commit()
    except Exception as e:
        print(f"Error resetting failed login: {e}")


def detect_suspicious_activity(voter_id, action):
    """Detect suspicious activity patterns"""
    try:
        # Check for rapid successive actions
        time_threshold = datetime.utcnow() - timedelta(minutes=1)

        recent_actions = AuditLog.query.filter(
            AuditLog.voter_id == voter_id,
            AuditLog.action == action,
            AuditLog.timestamp >= time_threshold
        ).count()

        if recent_actions >= 10:  # 10 actions in 1 minute
            create_attack_alert(
                alert_type='suspicious_activity',
                severity='medium',
                description=f'Suspicious rapid activity detected: {action} by voter {voter_id}',
                voter_id=voter_id
            )
            return True

        # Check for multiple failed attempts from same IP
        ip_address = request.remote_addr if request else None
        if ip_address:
            time_threshold = datetime.utcnow() - timedelta(minutes=10)

            failed_attempts = AuditLog.query.filter(
                AuditLog.ip_address == ip_address,
                AuditLog.status == 'failure',
                AuditLog.timestamp >= time_threshold
            ).count()

            if failed_attempts >= 15:  # 15 failures from same IP in 10 min
                create_attack_alert(
                    alert_type='multiple_failed_login',
                    severity='high',
                    description=f'Multiple failed attempts from IP: {ip_address}',
                    ip_address=ip_address
                )
                return True

        return False
    except Exception as e:
        print(f"Error detecting suspicious activity: {e}")
        return False


def create_attack_alert(alert_type, severity, description, voter_id=None, ip_address=None):
    """Create attack alert"""
    try:
        if not ip_address:
            ip_address = request.remote_addr if request else None

        alert = AttackAlert(
            alert_type=alert_type,
            severity=severity,
            description=description,
            voter_id=voter_id,
            ip_address=ip_address
        )
        db.session.add(alert)
        db.session.commit()

        # Send notification to admin
        send_admin_alert(alert)

        return alert
    except Exception as e:
        print(f"Error creating attack alert: {e}")
        return None


def send_admin_alert(alert, admin_email=None, smtp_config=None):
    """Send alert notification to admin"""
    try:
        if not admin_email or not smtp_config or not smtp_config.get('user'):
            print(f"[ALERT] {alert.severity.upper()}: {alert.description}")
            return True

        msg = MIMEMultipart()
        msg['From'] = smtp_config['user']
        msg['To'] = admin_email
        msg['Subject'] = f"[SECURITY ALERT] {alert.severity.upper()} - {alert.alert_type}"

        severity_colors = {
            'low': '#3b82f6',
            'medium': '#f59e0b',
            'high': '#ef4444',
            'critical': '#7f1d1d'
        }

        body = f"""
        <html>
        <body>
            <div style="background-color: {severity_colors.get(alert.severity, '#666')}; padding: 20px; color: white;">
                <h1>Security Alert</h1>
            </div>
            <div style="padding: 20px;">
                <h2>Alert Details</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Alert Type:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{alert.alert_type}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Severity:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{alert.severity.upper()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Description:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{alert.description}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>IP Address:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{alert.ip_address or 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">{alert.created_at}</td>
                    </tr>
                </table>
                <br>
                <p><strong>Action Required:</strong> Please investigate this security alert immediately.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Secure E-Voting System - Automated Security Alert
                </p>
            </div>
        </body>
        </html>
        """

        msg.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
            server.starttls()
            server.login(smtp_config['user'], smtp_config['password'])
            server.send_message(msg)

        # Mark as notified
        alert.notified = True
        db.session.commit()

        return True
    except Exception as e:
        print(f"Error sending admin alert: {e}")
        print(f"[ALERT] {alert.severity.upper()}: {alert.description}")
        return False


def is_account_locked(voter_id):
    """Check if voter account is locked"""
    try:
        voter = Voter.query.get(voter_id)
        if voter and voter.locked_until:
            if voter.locked_until > datetime.utcnow():
                minutes_remaining = int((voter.locked_until - datetime.utcnow()).total_seconds() / 60)
                return True, f"Account locked. Try again in {minutes_remaining} minutes"
            else:
                # Unlock account
                voter.locked_until = None
                db.session.commit()

        return False, "Account is active"
    except Exception as e:
        print(f"Error checking account lock: {e}")
        return False, "Account status unknown"
