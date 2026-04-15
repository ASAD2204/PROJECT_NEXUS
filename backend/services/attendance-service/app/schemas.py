from pydantic import BaseModel
from typing import Optional
from datetime import date, time


# ---------------------------------------------------------------------------
# GPS verification
# ---------------------------------------------------------------------------

class GPSVerifyRequest(BaseModel):
    latitude: float
    longitude: float


class GPSVerifyResponse(BaseModel):
    gps_verified: bool
    distance_meters: float


# ---------------------------------------------------------------------------
# Liveness verification
# ---------------------------------------------------------------------------

class LivenessVerifyRequest(BaseModel):
    image_data: str  # base64 encoded image


class LivenessVerifyResponse(BaseModel):
    liveness_verified: bool
    confidence: float
    eyes_state: Optional[str] = None     # "Open", "Closed", "No Face"
    ear_score: Optional[float] = None    # Eye Aspect Ratio
    fallback_available: bool = True      # Voice challenge available


# ---------------------------------------------------------------------------
# Voice liveness challenge (fallback when blink detection fails)
# ---------------------------------------------------------------------------

class VoiceChallengeResponse(BaseModel):
    challenge_word: str


class VoiceChallengeVerifyRequest(BaseModel):
    audio_data: str   # base64 encoded audio (WAV/FLAC)
    challenge_word: str


class VoiceChallengeVerifyResponse(BaseModel):
    verified: bool
    message: str


# ---------------------------------------------------------------------------
# Face verification & enrollment
# ---------------------------------------------------------------------------

class FaceVerifyRequest(BaseModel):
    image_data: str  # base64 encoded image
    section_id: int


class FaceVerifyResponse(BaseModel):
    attendance_marked: bool
    student_id: Optional[int] = None
    timestamp: Optional[str] = None


class FaceEnrollRequest(BaseModel):
    image_data: str  # base64 encoded image


class FaceEnrollMultiRequest(BaseModel):
    images: list[str]  # list of base64 encoded images (recommended: 4+)


# ---------------------------------------------------------------------------
# Attendance CRUD
# ---------------------------------------------------------------------------

class AttendanceOut(BaseModel):
    attendance_id: int
    section_id: int
    student_id: int
    date: date
    status: str
    check_in_time: Optional[time] = None
    gps_lat: Optional[float] = None
    gps_long: Optional[float] = None
    is_biometric_verified: Optional[bool] = None

    class Config:
        from_attributes = True


class AttendanceUpdate(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Generic message
# ---------------------------------------------------------------------------

class MessageResponse(BaseModel):
    message: str
