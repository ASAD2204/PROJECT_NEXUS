"""
Image processing utilities for the Attendance Service.

Provides:
  - CLAHE image enhancement for better face detection under poor lighting
  - Data augmentation (webcam simulation, brightness shifts) for robust enrollment
  - Eye Aspect Ratio (EAR) based blink / liveness detection

Reference: Face_Attendance_System (VisionPass)
"""

import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Optional heavy dependencies
# ---------------------------------------------------------------------------

try:
    import cv2
    import numpy as np

    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV not installed. Image enhancement/augmentation unavailable.")

try:
    from scipy.spatial import distance as dist

    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    logger.warning("scipy not installed. EAR-based liveness unavailable.")

try:
    import face_recognition as _fr

    FR_AVAILABLE = True
except ImportError:
    FR_AVAILABLE = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EAR_THRESHOLD_CLOSED = 0.22  # Below this → eyes are closed


# ---------------------------------------------------------------------------
# Image Enhancement
# ---------------------------------------------------------------------------


def enhance_image(image_bgr):
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to improve
    face detection accuracy under poor lighting.

    Args:
        image_bgr: BGR image (numpy array)
    Returns:
        Enhanced BGR image
    """
    if not CV2_AVAILABLE:
        return image_bgr
    try:
        lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_ch)
        enhanced = cv2.cvtColor(cv2.merge((cl, a_ch, b_ch)), cv2.COLOR_LAB2BGR)
        return enhanced
    except Exception as exc:
        logger.warning("CLAHE enhancement failed: %s", exc)
        return image_bgr


def enhance_rgb(image_rgb):
    """Convenience: enhance an RGB image (converts BGR ↔ RGB internally)."""
    if not CV2_AVAILABLE:
        return image_rgb
    bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    enhanced_bgr = enhance_image(bgr)
    return cv2.cvtColor(enhanced_bgr, cv2.COLOR_BGR2RGB)


# ---------------------------------------------------------------------------
# Data Augmentation for Enrollment
# ---------------------------------------------------------------------------


def _simulate_webcam_quality(image_bgr):
    """Simulate a low-quality webcam: pixelation + noise + contrast loss."""
    if not CV2_AVAILABLE:
        return image_bgr
    h, w = image_bgr.shape[:2]
    small = cv2.resize(image_bgr, (w // 2, h // 2), interpolation=cv2.INTER_LINEAR)
    pixelated = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)

    row, col, ch = pixelated.shape
    gauss = np.random.normal(0, 25, (row, col, ch))
    noisy = np.clip(pixelated + gauss, 0, 255).astype(np.uint8)
    washed_out = cv2.convertScaleAbs(noisy, alpha=0.8, beta=10)
    return washed_out


def generate_variations(image_bgr) -> list:
    """
    Generate augmented variations of an image for robust face enrollment.

    Given 1 input image, produces 4 variants:
      1. Original (enhanced)
      2. Simulated bad-webcam quality
      3. Darker exposure
      4. Brighter exposure

    Args:
        image_bgr: BGR image (numpy array)
    Returns:
        List of BGR images
    """
    if not CV2_AVAILABLE:
        return [image_bgr]

    enhanced = enhance_image(image_bgr)
    variations = [enhanced]

    # Simulated bad webcam
    variations.append(_simulate_webcam_quality(image_bgr))

    # HSV brightness variations
    try:
        hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        # Darker
        v_dark = np.clip(cv2.multiply(v, np.array([0.6])), 0, 255).astype(hsv.dtype)
        variations.append(cv2.cvtColor(cv2.merge((h, s, v_dark)), cv2.COLOR_HSV2BGR))

        # Brighter
        v_bright = np.clip(cv2.multiply(v, np.array([1.4])), 0, 255).astype(hsv.dtype)
        variations.append(cv2.cvtColor(cv2.merge((h, s, v_bright)), cv2.COLOR_HSV2BGR))
    except Exception as exc:
        logger.warning("Brightness augmentation failed: %s", exc)

    return variations


# ---------------------------------------------------------------------------
# Eye Aspect Ratio (EAR) — Blink Detection
# ---------------------------------------------------------------------------


def _get_ear(eye_points) -> float:
    """Compute the Eye Aspect Ratio for a set of 6 eye landmark points."""
    if not SCIPY_AVAILABLE:
        return 1.0  # Default to "open"
    A = dist.euclidean(eye_points[1], eye_points[5])
    B = dist.euclidean(eye_points[2], eye_points[4])
    C = dist.euclidean(eye_points[0], eye_points[3])
    if C == 0:
        return 1.0
    return (A + B) / (2.0 * C)


def detect_eyes_state(image_rgb) -> Tuple[str, float]:
    """
    Detect whether eyes are open or closed using Eye Aspect Ratio (EAR).

    The student must close their eyes tightly for liveness proof.  A photo
    of a screen or printed image will always have "Open" eyes.

    Args:
        image_rgb: RGB image (numpy array)
    Returns:
        tuple: (state, ear_score)
            state: "Open" | "Closed" | "No Face" | "Unavailable"
            ear_score: average Eye Aspect Ratio (lower = more closed)
    """
    if not FR_AVAILABLE or not SCIPY_AVAILABLE:
        return "Unavailable", 0.0

    landmarks_list = _fr.face_landmarks(image_rgb)
    if not landmarks_list:
        return "No Face", 0.0

    landmarks = landmarks_list[0]
    left_ear = _get_ear(landmarks["left_eye"])
    right_ear = _get_ear(landmarks["right_eye"])
    avg_ear = (left_ear + right_ear) / 2.0

    if avg_ear < EAR_THRESHOLD_CLOSED:
        return "Closed", avg_ear
    return "Open", avg_ear


# ---------------------------------------------------------------------------
# Voice Liveness Challenge
# ---------------------------------------------------------------------------


def verify_voice_challenge(audio_bytes: bytes, target_word: str) -> Tuple[bool, str]:
    """
    Verify that the user spoke the expected challenge word.

    Uses Google Speech Recognition (requires internet access).

    Args:
        audio_bytes: raw audio file bytes (WAV/FLAC/AIFF)
        target_word: the word the user was asked to say
    Returns:
        tuple: (is_correct, message)
    """
    try:
        import speech_recognition as sr
    except ImportError:
        return False, "SpeechRecognition library not installed"

    import io

    recognizer = sr.Recognizer()
    try:
        audio_file = io.BytesIO(audio_bytes)
        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)
        text = recognizer.recognize_google(audio_data)
        if target_word.lower() in text.lower():
            return True, f"Recognized: '{text}'"
        else:
            return False, f"Heard '{text}', expected '{target_word}'"
    except sr.UnknownValueError:
        return False, "Could not understand audio"
    except sr.RequestError as e:
        return False, f"Speech recognition service error: {e}"
    except Exception as e:
        return False, f"Audio processing error: {e}"


# ---------------------------------------------------------------------------
# Face Encoding with Enhancement
# ---------------------------------------------------------------------------


def get_face_encodings_enhanced(image_rgb) -> list:
    """
    Extract 128-D face encodings from an RGB image, applying CLAHE
    enhancement first for better accuracy.

    Args:
        image_rgb: RGB image (numpy array)
    Returns:
        list of 128-D numpy arrays (one per detected face)
    """
    if not FR_AVAILABLE:
        return []

    # Enhance the image before encoding
    enhanced = enhance_rgb(image_rgb)

    face_locations = _fr.face_locations(enhanced, model="hog")
    if not face_locations:
        # Retry without enhancement in case it hurt detection
        face_locations = _fr.face_locations(image_rgb, model="hog")
        if not face_locations:
            return []
        return _fr.face_encodings(image_rgb, face_locations)

    return _fr.face_encodings(enhanced, face_locations)
