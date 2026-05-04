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
    course_ids: list[int]
    days_of_week: list[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    slot_minutes: int = 60
    start_hour: int = 8
    end_hour: int = 17
    break_start_hour: Optional[int] = 13 # 1 PM
    break_end_hour: Optional[int] = 14   # 2 PM
    max_classes_per_day: Optional[int] = 4
    save_as_draft: bool = False
    draft_name: Optional[str] = None
    program_id: Optional[int] = None
    semester_id: Optional[int] = None


class GeneratedSlot(BaseModel):
    course_id: int
    day_of_week: str
    start_time: time
    end_time: time
    room_no: str


class GenerateOut(BaseModel):
    created: list[GeneratedSlot]
    unscheduled: list[str]
    timetable_set_id: Optional[int] = None


class TimetableSetOut(BaseModel):
    set_id: int
    name: str
    status: str
    program_id: Optional[int] = None
    semester_id: Optional[int] = None
    generated_by: Optional[str] = None
    created_at: Optional[str] = None
    created_count: int = 0


class TimetableSetDetailOut(TimetableSetOut):
    created: list[GeneratedSlot]
