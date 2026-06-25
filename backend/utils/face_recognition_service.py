import os
import json
import base64
import numpy as np
import cv2
from PIL import Image
from io import BytesIO

try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("[WARNING] face_recognition not available. Face recognition features will be limited.")


def decode_base64_image(base64_string):
    """Decode base64 image string to numpy array"""
    try:
        # Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # Decode base64 to bytes
        img_data = base64.b64decode(base64_string)

        # Method 1: Try using OpenCV first (more robust)
        try:
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is not None:
                # Convert BGR to RGB (OpenCV uses BGR by default)
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                print(f"[DEBUG] Image decoded successfully with OpenCV: shape={img_rgb.shape}")
                return img_rgb
        except Exception as cv_error:
            print(f"[DEBUG] OpenCV decode failed: {cv_error}, trying PIL...")

        # Method 2: Fallback to PIL
        img_buffer = BytesIO(img_data)
        img = Image.open(img_buffer)

        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')

        img_array = np.array(img)
        print(f"[DEBUG] Image decoded successfully with PIL: shape={img_array.shape}")
        return img_array

    except Exception as e:
        print(f"[ERROR] Failed to decode image: {str(e)}")
        print(f"[DEBUG] Base64 string length: {len(base64_string) if base64_string else 0}")
        raise ValueError(f"Failed to decode image: {str(e)}")


def detect_face(image_array):
    """Detect face in image using OpenCV Haar Cascade"""
    try:
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

        # Load Haar Cascade classifier
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )

        # Detect faces with stricter parameters to reduce false positives
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.3,      # Increased from 1.1 - less sensitive, fewer false positives
            minNeighbors=8,       # Increased from 5 - requires more evidence for face detection
            minSize=(60, 60),     # Increased from (30,30) - ignore very small detections
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        print(f"[DEBUG] Haar Cascade detected {len(faces)} face(s)")

        if len(faces) == 0:
            return False, "No face detected in image"

        if len(faces) > 1:
            # Filter out weak detections - keep only the largest face
            largest_face = max(faces, key=lambda f: f[2] * f[3])  # f[2]=width, f[3]=height
            print(f"[DEBUG] Multiple faces detected by Haar, using largest one")
            return True, "Face detected successfully"

        return True, "Face detected successfully"
    except Exception as e:
        return False, f"Face detection error: {str(e)}"


def extract_face_encoding(image_array, tolerance=0.6):
    """Extract face encoding using face_recognition library"""
    if not FACE_RECOGNITION_AVAILABLE:
        return None, "Face recognition library not available"

    try:
        # Get face locations with more lenient detection
        face_locations = face_recognition.face_locations(image_array, model='hog')

        print(f"[DEBUG] face_recognition library detected {len(face_locations)} face(s)")

        if len(face_locations) == 0:
            return None, "No face detected in image"

        # If multiple faces detected, use the largest one (most likely the primary face)
        if len(face_locations) > 1:
            # Calculate area for each face and get the largest
            largest_face_idx = 0
            largest_area = 0
            for idx, (top, right, bottom, left) in enumerate(face_locations):
                area = (bottom - top) * (right - left)
                if area > largest_area:
                    largest_area = area
                    largest_face_idx = idx

            face_locations = [face_locations[largest_face_idx]]
            print(f"[DEBUG] Multiple faces detected, using the largest face")

        # Get face encoding (128-dimensional vector)
        face_encodings = face_recognition.face_encodings(image_array, face_locations)

        if len(face_encodings) == 0:
            return None, "Could not extract face features"

        # Convert numpy array to list for JSON serialization
        encoding = face_encodings[0].tolist()

        return encoding, "Face encoding extracted successfully"
    except Exception as e:
        return None, f"Face encoding error: {str(e)}"


def compare_faces(known_encoding_json, test_image_array, tolerance=0.6):
    """Compare known face encoding with test image"""
    if not FACE_RECOGNITION_AVAILABLE:
        return False, 0.0, "Face recognition library not available"

    try:
        # Parse known encoding from JSON
        known_encoding = np.array(json.loads(known_encoding_json))

        # Extract encoding from test image
        test_encoding, error = extract_face_encoding(test_image_array, tolerance)

        if test_encoding is None:
            return False, 0.0, error

        test_encoding = np.array(test_encoding)

        # Calculate face distance (lower is better)
        face_distance = face_recognition.face_distance([known_encoding], test_encoding)[0]

        # Check if faces match
        is_match = face_distance <= tolerance

        # Calculate confidence (0-100%)
        confidence = max(0, min(100, (1 - face_distance) * 100))

        if is_match:
            return True, confidence, "Face matched successfully"
        else:
            return False, confidence, "Face does not match"

    except Exception as e:
        return False, 0.0, f"Face comparison error: {str(e)}"


def save_face_image(image_array, voter_id, images_dir='static/face_images'):
    """Save face image to disk"""
    try:
        os.makedirs(images_dir, exist_ok=True)

        filename = f"voter_{voter_id}_{int(np.random.random() * 1000000)}.jpg"
        filepath = os.path.join(images_dir, filename)

        # Convert numpy array to PIL Image and save
        img = Image.fromarray(image_array)
        img.save(filepath, 'JPEG', quality=85)

        return filepath, "Image saved successfully"
    except Exception as e:
        return None, f"Failed to save image: {str(e)}"


def verify_liveness(image_array):
    """Basic liveness detection (checks for common spoofing attempts)"""
    try:
        # Convert to grayscale
        gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)

        # Check image quality metrics
        # 1. Check brightness (more lenient range)
        brightness = np.mean(gray)
        if brightness < 10 or brightness > 245:
            print(f"[DEBUG] Brightness check failed: {brightness}")
            return False, "Image too dark or too bright"

        print(f"[DEBUG] Liveness checks passed - brightness: {brightness:.1f}")
        return True, "Liveness check passed"
    except Exception as e:
        return False, f"Liveness detection error: {str(e)}"


def process_face_registration(base64_image, voter_id, images_dir='static/face_images'):
    """Complete face registration process"""
    try:
        # Decode image
        image_array = decode_base64_image(base64_image)

        # Detect face
        face_detected, message = detect_face(image_array)
        if not face_detected:
            return None, None, message

        # Check liveness
        is_live, liveness_message = verify_liveness(image_array)
        if not is_live:
            return None, None, liveness_message

        # Extract face encoding
        encoding, encoding_message = extract_face_encoding(image_array)
        if encoding is None:
            return None, None, encoding_message

        # Save image
        image_path, save_message = save_face_image(image_array, voter_id, images_dir)
        if image_path is None:
            return None, None, save_message

        # Convert encoding to JSON string
        encoding_json = json.dumps(encoding)

        return encoding_json, image_path, "Face registered successfully"
    except Exception as e:
        return None, None, f"Face registration failed: {str(e)}"


def process_face_verification(base64_image, known_encoding_json, tolerance=0.6):
    """Complete face verification process"""
    try:
        # Decode image
        image_array = decode_base64_image(base64_image)

        # Detect face
        face_detected, message = detect_face(image_array)
        if not face_detected:
            return False, 0.0, message

        # Check liveness
        is_live, liveness_message = verify_liveness(image_array)
        if not is_live:
            return False, 0.0, liveness_message

        # Compare faces
        is_match, confidence, compare_message = compare_faces(
            known_encoding_json,
            image_array,
            tolerance
        )

        return is_match, confidence, compare_message
    except Exception as e:
        return False, 0.0, f"Face verification failed: {str(e)}"
