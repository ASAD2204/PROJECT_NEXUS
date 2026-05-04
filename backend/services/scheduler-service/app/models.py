from sqlalchemy import Column, ForeignKey, Integer, String, Time, Boolean, Text, TIMESTAMP, func
from sqlalchemy.orm import relationship

from app.database import Base


class SisFacultyAvailability(Base):
    __tablename__ = "sis_faculty_availability"
    __table_args__ = {"extend_existing": True}

    avail_id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer)
    day_of_week = Column(String(10))
    start_time = Column(Time)
    end_time = Column(Time)
    is_available = Column(Boolean)


class LmsCourse(Base):
    __tablename__ = "lms_courses"
    __table_args__ = {"extend_existing": True}
    course_id = Column(Integer, primary_key=True)
    program_id = Column(Integer)
    semester_id = Column(Integer)
    faculty_id = Column(Integer)
    room_no = Column(String(20))
    code = Column(String(20))
    title = Column(String(100))
    lectures_per_week = Column(Integer)
    lecture_duration_minutes = Column(Integer)


class LmsTimetableSlot(Base):
    __tablename__ = "lms_timetable_slots"
    __table_args__ = {"extend_existing": True}

    slot_id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("lms_courses.course_id"))
    day_of_week = Column(String(10))
    start_time = Column(Time)
    end_time = Column(Time)
    room_no = Column(String(20))
    
    course = relationship("LmsCourse")


class SisClassroom(Base):
    __tablename__ = "sis_classrooms"
    __table_args__ = {"extend_existing": True}

    classroom_id = Column(Integer, primary_key=True)
    room_no = Column(String(20))


class SchedConstraint(Base):
    __tablename__ = "sched_constraints"

    constraint_id = Column(Integer, primary_key=True, autoincrement=True)
    resource_type = Column(String(20), nullable=False)  # faculty | room
    resource_id = Column(String(64), nullable=False)
    day_of_week = Column(String(10), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    note = Column(String(255))


class SchedTimetableSet(Base):
    __tablename__ = "sched_timetable_sets"

    set_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(120), nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    program_id = Column(Integer, nullable=True)
    semester_id = Column(Integer, nullable=True)
    generated_by = Column(String(64), nullable=True)
    slots_json = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
