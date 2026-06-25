"""
Voice Recognition Service for Voting
Converts speech to text to identify candidate names
"""

import speech_recognition as sr
from difflib import get_close_matches
import tempfile
import os
import io


class VoiceRecognitionService:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        # Adjust for ambient noise
        self.recognizer.energy_threshold = 4000
        self.recognizer.dynamic_energy_threshold = True

    def audio_bytes_to_wav(self, audio_bytes, original_format='webm'):
        """Convert audio bytes to WAV file"""
        try:
            print(f"[DEBUG VoiceRecognizer] Converting {len(audio_bytes)} bytes")
            print(f"[DEBUG VoiceRecognizer] First 20 bytes: {audio_bytes[:20]}")

            # Try to convert using pydub if available
            try:
                from pydub import AudioSegment

                # Write original audio to temp file
                with tempfile.NamedTemporaryFile(delete=False, suffix=f'.webm') as temp_input:
                    temp_input.write(audio_bytes)
                    input_path = temp_input.name

                print(f"[DEBUG VoiceRecognizer] Trying to load audio from {input_path}")

                # Try different formats
                formats_to_try = ['webm', 'ogg', 'wav', 'mp3']
                audio = None

                for fmt in formats_to_try:
                    try:
                        print(f"[DEBUG VoiceRecognizer] Trying format: {fmt}")
                        audio = AudioSegment.from_file(input_path, format=fmt)
                        print(f"[DEBUG VoiceRecognizer] ✅ Successfully loaded as {fmt}")
                        break
                    except Exception as fmt_error:
                        print(f"[DEBUG VoiceRecognizer] ❌ Failed as {fmt}: {str(fmt_error)}")
                        continue

                if audio is None:
                    os.remove(input_path)
                    return None, "Could not decode audio file. Please ensure you're using a supported format."

                # Export as WAV
                output_path = tempfile.mktemp(suffix='.wav')
                audio.export(output_path, format='wav')

                # Clean up input file
                os.remove(input_path)

                print(f"[DEBUG VoiceRecognizer] Converted to WAV: {output_path}")
                return output_path, None

            except ImportError:
                print("[DEBUG VoiceRecognizer] pydub not available, trying direct WAV write")
                # pydub not available, assume it's already WAV format
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                    temp_file.write(audio_bytes)
                    temp_path = temp_file.name
                return temp_path, None

        except Exception as e:
            print(f"[DEBUG VoiceRecognizer] Error converting audio: {str(e)}")
            import traceback
            traceback.print_exc()
            return None, f"Failed to process audio file: {str(e)}"

    def recognize_speech_from_audio_file(self, audio_file_path):
        """
        Recognize speech from audio file
        Returns: (text, confidence, error)
        """
        try:
            print(f"[DEBUG VoiceRecognizer] Opening audio file: {audio_file_path}")

            with sr.AudioFile(audio_file_path) as source:
                print(f"[DEBUG VoiceRecognizer] Audio file opened successfully")
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                # Record the audio
                audio_data = self.recognizer.record(source)
                print(f"[DEBUG VoiceRecognizer] Audio data recorded")

            # Try Google Speech Recognition first
            try:
                print("[DEBUG VoiceRecognizer] Attempting Google Speech Recognition...")
                text = self.recognizer.recognize_google(audio_data)
                print(f"[DEBUG VoiceRecognizer] ✅ Recognized: '{text}'")
                confidence = 0.85  # Google doesn't provide confidence, using default
                return text.lower(), confidence, None
            except sr.UnknownValueError:
                print("[DEBUG VoiceRecognizer] ❌ Google: Could not understand audio")
                return None, 0, "Could not understand audio. Please speak clearly."
            except sr.RequestError as e:
                print(f"[DEBUG VoiceRecognizer] ❌ Google error: {str(e)}, trying Sphinx...")
                # Fallback to Sphinx (offline)
                try:
                    text = self.recognizer.recognize_sphinx(audio_data)
                    print(f"[DEBUG VoiceRecognizer] ✅ Sphinx recognized: '{text}'")
                    confidence = 0.70  # Lower confidence for offline recognition
                    return text.lower(), confidence, None
                except sr.UnknownValueError:
                    print("[DEBUG VoiceRecognizer] ❌ Sphinx: Could not understand audio")
                    return None, 0, "Could not understand audio. Please speak clearly."
                except sr.RequestError as sphinx_err:
                    print(f"[DEBUG VoiceRecognizer] ❌ Sphinx error: {str(sphinx_err)}")
                    return None, 0, "Speech recognition service unavailable"

        except Exception as e:
            print(f"[DEBUG VoiceRecognizer] ❌ Exception: {str(e)}")
            import traceback
            traceback.print_exc()
            return None, 0, f"Speech recognition failed: {str(e)}"
        finally:
            # Clean up temp file
            if os.path.exists(audio_file_path):
                try:
                    os.remove(audio_file_path)
                    print(f"[DEBUG VoiceRecognizer] Cleaned up temp file")
                except:
                    pass

    def recognize_speech_from_bytes(self, audio_bytes):
        """
        Recognize speech from audio bytes
        Returns: (text, confidence, error)
        """
        temp_path, error = self.audio_bytes_to_wav(audio_bytes)
        if error:
            return None, 0, error

        return self.recognize_speech_from_audio_file(temp_path)

    def match_candidate_name(self, spoken_text, candidate_names, threshold=0.6):
        """
        Match spoken text to candidate name
        Returns: (matched_name, similarity_score, error)
        """
        try:
            print(f"[DEBUG VoiceRecognizer] Matching '{spoken_text}' against candidates: {candidate_names}")

            if not spoken_text:
                return None, 0, "No speech detected"

            if not candidate_names:
                return None, 0, "No candidates available"

            # Normalize candidate names
            normalized_candidates = {name.lower(): name for name in candidate_names}
            print(f"[DEBUG VoiceRecognizer] Normalized candidates: {list(normalized_candidates.keys())}")

            # Try exact match first
            if spoken_text in normalized_candidates:
                print(f"[DEBUG VoiceRecognizer] ✅ Exact match found: {normalized_candidates[spoken_text]}")
                return normalized_candidates[spoken_text], 1.0, None

            # Try fuzzy matching with more lenient threshold
            print(f"[DEBUG VoiceRecognizer] Trying fuzzy match with threshold {threshold}...")
            matches = get_close_matches(
                spoken_text,
                normalized_candidates.keys(),
                n=3,  # Get top 3 matches
                cutoff=threshold
            )

            print(f"[DEBUG VoiceRecognizer] Fuzzy matches found: {matches}")

            if matches:
                matched_name = normalized_candidates[matches[0]]
                # Calculate similarity score
                similarity = self._calculate_similarity(spoken_text, matches[0])
                print(f"[DEBUG VoiceRecognizer] ✅ Best match: '{matched_name}' (similarity: {similarity:.2f})")
                return matched_name, similarity, None

            # Try partial matching
            print(f"[DEBUG VoiceRecognizer] Trying partial matching...")
            for normalized_name, original_name in normalized_candidates.items():
                if spoken_text in normalized_name or normalized_name in spoken_text:
                    similarity = len(spoken_text) / max(len(normalized_name), len(spoken_text))
                    print(f"[DEBUG VoiceRecognizer] Partial match found: '{original_name}' (similarity: {similarity:.2f})")
                    if similarity >= threshold:
                        return original_name, similarity, None

            # Build helpful error message with available candidates
            candidates_list = ', '.join([f'"{name}"' for name in candidate_names])
            error_msg = f"Could not match '{spoken_text}' to any candidate. Available candidates: {candidates_list}. Please speak clearly and say the full candidate name."
            print(f"[DEBUG VoiceRecognizer] ❌ No match found")
            return None, 0, error_msg

        except Exception as e:
            print(f"[DEBUG VoiceRecognizer] ❌ Exception in matching: {str(e)}")
            return None, 0, f"Name matching failed: {str(e)}"

    def _calculate_similarity(self, text1, text2):
        """Calculate simple similarity score between two texts"""
        # Using a simple ratio of matching characters
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1, text2).ratio()


# Global instance
voice_recognizer = VoiceRecognitionService()
