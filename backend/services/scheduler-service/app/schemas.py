from datetime import time
from typing import Optional

from pydantic import BaseModel


class ConstraintCreate(BaseModel):
    resource_type: str
    resource_id: str
    day_of_week: str
    start_time: time
    end_time: time
    note: Optional[str] = None


class ConstraintOut(BaseModel):
    constraint_id: int
    resource_type: str
    resource_id: str
    day_of_week: str
    start_time: time
    end_time: time
    note: Optional[str] = None

    class Config:
        from_attributes = True


class GenerateRequest(BaseModel):
    section_ids: list[int]
    days_of_week: list[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    slot_minutes: int = 60
    start_hour: int = 8
    end_hour: int = 17


class GeneratedSlot(BaseModel):
    section_id: int
    day_of_week: str
    start_time: time
    end_time: time
    room_no: str


class GenerateOut(BaseModel):
    created: list[GeneratedSlot]
    unscheduled: list[str]
