"""
Aadhaar Photo Verification Service
Extracts face from Aadhaar card and compares with user's selfie
"""

import face_recognition
import numpy as np
from PIL import Image
import io
import base64
import cv2
import os


class AadhaarPhotoVerification:
    def __init__(self, tolerance=0.6):
        """
        Initialize Aadhaar photo verification service
        Args:
            tolerance: Face matching tolerance (lower is more strict)
        """
        self.tolerance = tolerance

    def base64_to_image(self, base64_string):
        """
        Convert base64 string to PIL Image
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]

            # Decode base64
            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')

            return image, None
        except Exception as e:
            return None, f"Failed to decode image: {str(e)}"

    def extract_face_from_aadhaar(self, aadhaar_image_base64):
        """
        Extract face encoding from Aadhaar card image
        Args:
            aadhaar_image_base64: Base64 encoded Aadhaar card image
        Returns:
            (face_encoding, error)
        """
        try:
            # Convert base64 to image
            image, error = self.base64_to_image(aadhaar_image_base64)
            if error:
                return None, error

            # Convert PIL image to numpy array
            image_np = np.array(image)

            # Detect faces in the Aadhaar card
            face_locations = face_recognition.face_locations(image_np)

            if len(face_locations) == 0:
                return None, "No face detected in Aadhaar card image. Please upload a clear Aadhaar card photo."

            if len(face_locations) > 1:
                # If multiple faces detected, use the largest one (likely the main photo)
                face_locations = [max(face_locations, key=lambda loc: (loc[2] - loc[0]) * (loc[1] - loc[3]))]

            # Extract face encodings
            face_encodings = face_recognition.face_encodings(image_np, face_locations)

            if len(face_encodings) == 0:
                return None, "Could not extract face features from Aadhaar card."

            return face_encodings[0], None

        except Exception as e:
            return None, f"Failed to process Aadhaar card: {str(e)}"

    def extract_face_from_selfie(self, selfie_base64):
        """
        Extract face encoding from selfie image
        Args:
            selfie_base64: Base64 encoded selfie image
        Returns:
            (face_encoding, error)
        """
        try:
            # Convert base64 to image
            image, error = self.base64_to_image(selfie_base64)
            if error:
                return None, error

            # Convert PIL image to numpy array
            image_np = np.array(image)

            # Detect faces
            face_locations = face_recognition.face_locations(image_np)

            if len(face_locations) == 0:
                return None, "No face detected in selfie. Please take a clear photo of your face."

            if len(face_locations) > 1:
                return None, "Multiple faces detected in selfie. Please ensure only your face is visible."

            # Extract face encoding
            face_encodings = face_recognition.face_encodings(image_np, face_locations)

            if len(face_encodings) == 0:
                return None, "Could not extract face features from selfie."

            return face_encodings[0], None

        except Exception as e:
            return None, f"Failed to process selfie: {str(e)}"

    def compare_faces(self, aadhaar_encoding, selfie_encoding):
        """
        Compare face encoding from Aadhaar with selfie
        Args:
            aadhaar_encoding: Face encoding from Aadhaar card
            selfie_encoding: Face encoding from selfie
        Returns:
            (is_match, confidence, error)
        """
        try:
            # Calculate face distance
            face_distance = face_recognition.face_distance([aadhaar_encoding], selfie_encoding)[0]

            # Convert distance to similarity score (0-1, higher is better)
            confidence = 1 - face_distance

            # Check if faces match
            is_match = face_distance <= self.tolerance

            return is_match, confidence, None

        except Exception as e:
            return False, 0, f"Face comparison failed: {str(e)}"

    def verify_aadhaar_with_selfie(self, aadhaar_image_base64, selfie_base64):
        """
        Complete verification: extract faces and compare
        Args:
            aadhaar_image_base64: Base64 encoded Aadhaar card image
            selfie_base64: Base64 encoded selfie image
        Returns:
            (is_verified, confidence, message)
        """
        # Extract face from Aadhaar
        print("🔍 Extracting face from Aadhaar card...")
        aadhaar_encoding, aadhaar_error = self.extract_face_from_aadhaar(aadhaar_image_base64)
        if aadhaar_error:
            print(f"❌ Aadhaar face extraction failed: {aadhaar_error}")
            return False, 0, aadhaar_error
        print("✅ Aadhaar face extracted successfully")

        # Extract face from selfie
        print("🔍 Extracting face from selfie...")
        selfie_encoding, selfie_error = self.extract_face_from_selfie(selfie_base64)
        if selfie_error:
            print(f"❌ Selfie face extraction failed: {selfie_error}")
            return False, 0, selfie_error
        print("✅ Selfie face extracted successfully")

        # Compare faces
        print("🔍 Comparing faces...")
        is_match, confidence, compare_error = self.compare_faces(aadhaar_encoding, selfie_encoding)
        if compare_error:
            print(f"❌ Face comparison failed: {compare_error}")
            return False, 0, compare_error

        print(f"📊 Face match confidence: {confidence*100:.1f}% (threshold: {(1-self.tolerance)*100:.1f}%)")

        if is_match:
            message = f"✅ Face verification successful! Match confidence: {confidence*100:.1f}%"
            print(f"✅ {message}")
            return True, confidence, message
        else:
            message = f"⚠️ Face match confidence ({confidence*100:.1f}%) is below the required threshold ({(1-self.tolerance)*100:.1f}%). Please try again with better lighting and ensure your face is clearly visible in both photos."
            print(f"❌ {message}")
            return False, confidence, message

    def save_aadhaar_image(self, aadhaar_image_base64, voter_id, save_dir):
        """
        Save Aadhaar card image to disk
        Args:
            aadhaar_image_base64: Base64 encoded Aadhaar image
            voter_id: Voter ID for filename
            save_dir: Directory to save images
        Returns:
            (file_path, error)
        """
        try:
            # Create directory if it doesn't exist
            os.makedirs(save_dir, exist_ok=True)

            # Convert base64 to image
            image, error = self.base64_to_image(aadhaar_image_base64)
            if error:
                return None, error

            # Save image
            file_path = os.path.join(save_dir, f"aadhaar_{voter_id}.jpg")
            image.save(file_path, "JPEG")

            return file_path, None

        except Exception as e:
            return None, f"Failed to save Aadhaar image: {str(e)}"


# Global instance
# Higher tolerance (0.8) for Aadhaar verification because:
# - Aadhaar photo is printed and then photographed (quality loss)
# - Different lighting conditions between Aadhaar and selfie
# - Different angles and expressions
# - Still secure enough to prevent fraud while being user-friendly
aadhaar_photo_verifier = AadhaarPhotoVerification(tolerance=0.8)
