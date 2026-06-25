import re
import hashlib


def validate_aadhaar_format(aadhaar_number):
    """Validate Aadhaar number format (12 digits)"""
    # Remove spaces and hyphens
    aadhaar = re.sub(r'[\s-]', '', str(aadhaar_number))

    # Check if exactly 12 digits
    if not re.match(r'^\d{12}$', aadhaar):
        return False, "Aadhaar number must be exactly 12 digits"

    # Aadhaar cannot start with 0 or 1
    if aadhaar[0] in ['0', '1']:
        return False, "Invalid Aadhaar number format"

    return True, aadhaar


def verify_aadhaar_checksum(aadhaar_number):
    """Verify Aadhaar number using Verhoeff algorithm"""
    # Verhoeff multiplication table
    d_table = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
        [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
        [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
        [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
        [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ]

    # Permutation table
    p_table = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
        [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
        [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
        [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ]

    # Inverse table
    inv_table = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

    aadhaar = str(aadhaar_number)
    c = 0
    reversed_aadhaar = aadhaar[::-1]

    for i, char in enumerate(reversed_aadhaar):
        c = d_table[c][p_table[(i % 8)][int(char)]]

    return c == 0


def validate_aadhaar_number(aadhaar_number):
    """Complete Aadhaar validation"""
    import os

    # Format validation
    is_valid_format, result = validate_aadhaar_format(aadhaar_number)
    if not is_valid_format:
        return False, result

    aadhaar = result

    # Development mode: Skip checksum validation if DEV_MODE is enabled
    dev_mode = os.getenv('DEV_MODE', 'False').lower() == 'true'

    if dev_mode:
        print(f"[DEV MODE] Aadhaar validation bypassed for: {aadhaar}")
        return True, aadhaar

    # Checksum validation using Verhoeff algorithm
    if not verify_aadhaar_checksum(aadhaar):
        return False, "Invalid Aadhaar number (checksum failed)"

    return True, aadhaar


def hash_aadhaar(aadhaar_number):
    """Hash Aadhaar number for secure storage"""
    return hashlib.sha256(aadhaar_number.encode()).hexdigest()


def validate_voter_id(voter_id):
    """Validate Voter ID format (state-specific formats)"""
    # Remove spaces
    voter_id = voter_id.strip().upper()

    # Standard format: 3 letters + 7 digits (e.g., ABC1234567)
    if not re.match(r'^[A-Z]{3}\d{7}$', voter_id):
        return False, "Invalid Voter ID format. Expected format: ABC1234567"

    return True, voter_id


def mock_aadhaar_api_verification(aadhaar_number, name):
    """
    Mock Aadhaar API verification (simulates UIDAI API)
    In production, integrate with actual UIDAI API or approved service provider
    """
    import os

    # Format validation
    is_valid, result = validate_aadhaar_number(aadhaar_number)
    if not is_valid:
        return {
            'success': False,
            'message': result,
            'verified': False
        }

    aadhaar = result

    # Development mode: Always accept in DEV_MODE
    dev_mode = os.getenv('DEV_MODE', 'False').lower() == 'true'

    if dev_mode:
        return {
            'success': True,
            'verified': True,
            'message': 'Aadhaar verified successfully (DEV MODE - Name validation bypassed)',
            'aadhaar_holder': name,
            'masked_aadhaar': f"XXXX-XXXX-{aadhaar[-4:]}"
        }

    # Mock verification based on test data (only used in production mode)
    # In production, this would call actual UIDAI API
    mock_database = {
        '234567890123': {'name': 'Test User', 'dob': '1990-01-01', 'gender': 'M'},
        '345678901234': {'name': 'John Doe', 'dob': '1985-05-15', 'gender': 'M'},
        '456789012345': {'name': 'Jane Smith', 'dob': '1992-08-22', 'gender': 'F'},
    }

    if aadhaar in mock_database:
        stored_data = mock_database[aadhaar]
        # Simple name matching (fuzzy matching in production)
        name_match = name.lower() in stored_data['name'].lower() or stored_data['name'].lower() in name.lower()

        return {
            'success': True,
            'verified': name_match,
            'message': 'Aadhaar verified successfully' if name_match else 'Name does not match Aadhaar records',
            'aadhaar_holder': stored_data['name'],
            'masked_aadhaar': f"XXXX-XXXX-{aadhaar[-4:]}"
        }
    else:
        # Fallback: accept any valid format
        return {
            'success': True,
            'verified': True,
            'message': 'Aadhaar verified successfully',
            'aadhaar_holder': name,
            'masked_aadhaar': f"XXXX-XXXX-{aadhaar[-4:]}"
        }


def link_aadhaar_voter_id(aadhaar_number, voter_id):
    """
    Link Aadhaar with Voter ID
    In production, verify against Election Commission database
    """
    # Validate Aadhaar
    aadhaar_valid, aadhaar_result = validate_aadhaar_number(aadhaar_number)
    if not aadhaar_valid:
        return False, aadhaar_result

    # Validate Voter ID
    voter_id_valid, voter_id_result = validate_voter_id(voter_id)
    if not voter_id_valid:
        return False, voter_id_result

    # Mock verification (in production, check with EC database)
    return True, {
        'aadhaar': aadhaar_result,
        'voter_id': voter_id_result,
        'linked': True,
        'message': 'Aadhaar and Voter ID linked successfully'
    }
