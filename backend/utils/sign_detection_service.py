import cv2
import mediapipe as mp
import numpy as np
import pickle
import os
from werkzeug.utils import secure_filename

class SignDetectionService:
    def __init__(self, model_path='sign_language_rf_model.pkl'):
        """Initialize the sign detection service with trained model"""
        
        # Load trained Random Forest model
        self.model_path = model_path
        self.model = None
        self.load_model()
        
        # Initialize MediaPipe Hands
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=0.7
        )
        
    def load_model(self):
        """Load the trained Random Forest model"""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at {self.model_path}. Please train the model first.")
        
        with open(self.model_path, 'rb') as f:
            self.model = pickle.load(f)
        print(f"✓ Sign language model loaded from {self.model_path}")
    
    def extract_landmarks(self, image):
        """
        Extract hand landmarks from image
        Returns: landmarks array (126 features) or None if no hand detected
        """
        print(f"[DEBUG SignDetector] Extracting landmarks from image shape: {image.shape}")

        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Process image
        results = self.hands.process(image_rgb)

        if not results.multi_hand_landmarks:
            print("[DEBUG SignDetector] No hand landmarks detected")
            return None, "No hand detected in image"

        print(f"[DEBUG SignDetector] Detected {len(results.multi_hand_landmarks)} hand(s)")

        # Initialize landmarks array with zeros
        landmarks = [0] * 126  # 2 hands × 21 landmarks × 3 coords = 126 features

        # Extract landmarks for each detected hand
        for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
            hand_coords = []
            for landmark in hand_landmarks.landmark:
                hand_coords.extend([landmark.x, landmark.y, landmark.z])

            # Place in appropriate position (first 63 or last 63 features)
            if idx == 0:
                landmarks[0:63] = hand_coords
            elif idx == 1:
                landmarks[63:126] = hand_coords

        print(f"[DEBUG SignDetector] Landmarks extracted successfully")
        return np.array(landmarks).reshape(1, -1), None
    
    def detect_sign(self, image_path):
        """
        Detect sign from image file
        Returns: (detected_sign, confidence, error_message)
        """
        try:
            # Read image
            image = cv2.imread(image_path)
            if image is None:
                return None, 0.0, "Failed to read image"
            
            # Extract landmarks
            landmarks, error = self.extract_landmarks(image)
            if landmarks is None:
                return None, 0.0, error
            
            # Predict sign
            prediction = self.model.predict(landmarks)[0]
            
            # Get prediction probabilities for confidence
            probabilities = self.model.predict_proba(landmarks)[0]
            confidence = float(max(probabilities))
            
            return int(prediction), confidence, None
            
        except Exception as e:
            return None, 0.0, f"Detection error: {str(e)}"
    
    def detect_sign_from_bytes(self, image_bytes):
        """
        Detect sign from image bytes (uploaded file)
        Returns: (detected_sign, confidence, error_message)
        """
        try:
            print(f"[DEBUG SignDetector] Processing {len(image_bytes)} bytes")

            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                print("[DEBUG SignDetector] Failed to decode image")
                return None, 0.0, "Failed to decode image"

            print(f"[DEBUG SignDetector] Image decoded successfully: shape={image.shape}")

            # Extract landmarks
            landmarks, error = self.extract_landmarks(image)
            if landmarks is None:
                print(f"[DEBUG SignDetector] Landmark extraction failed: {error}")
                return None, 0.0, error

            print(f"[DEBUG SignDetector] Landmarks extracted: shape={landmarks.shape}")

            # Predict sign
            prediction = self.model.predict(landmarks)[0]

            # Get prediction probabilities for confidence
            probabilities = self.model.predict_proba(landmarks)[0]
            confidence = float(max(probabilities))

            print(f"[DEBUG SignDetector] Prediction: {prediction}, Confidence: {confidence}")

            return int(prediction), confidence, None

        except Exception as e:
            print(f"[DEBUG SignDetector] Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            return None, 0.0, f"Detection error: {str(e)}"
    
    def validate_sign_for_candidates(self, detected_sign, num_candidates):
        """
        Validate if detected sign is valid for current election
        Sign detection model supports 0-9, allowing votes for candidates 1-9
        """
        # Allow signs 1-9 for voting (0 is not used for candidate selection)
        if detected_sign < 1 or detected_sign > 9:
            return False, f"Invalid sign {detected_sign}. Valid signs are 1-9"
        return True, None
    
    def save_uploaded_image(self, file, upload_folder='static/sign_votes'):
        """Save uploaded image and return the path"""
        try:
            # Create upload folder if it doesn't exist
            os.makedirs(upload_folder, exist_ok=True)
            
            # Generate secure filename
            filename = secure_filename(file.filename)
            timestamp = int(cv2.getTickCount())
            unique_filename = f"sign_{timestamp}_{filename}"
            
            filepath = os.path.join(upload_folder, unique_filename)
            file.save(filepath)
            
            return filepath, None
        except Exception as e:
            return None, f"Failed to save image: {str(e)}"


# Singleton instance
sign_detector = SignDetectionService()