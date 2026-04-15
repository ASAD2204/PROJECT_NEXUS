from sqlalchemy import Column, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship

from app.database import Base


class LmsSection(Base):
    __tablename__ = "lms_sections"
    __table_args__ = {"extend_existing": True}

    section_id = Column(Integer, primary_key=True)
    faculty_id = Column(Integer)
    room_no = Column(String(20))


class LmsTimetableSlot(Base):
    __tablename__ = "lms_timetable_slots"
    __table_args__ = {"extend_existing": True}

    slot_id = Column(Integer, primary_key=True, autoincrement=True)
    section_id = Column(Integer, ForeignKey("lms_sections.section_id"))
    day_of_week = Column(String(10))
    start_time = Column(Time)
    end_time = Column(Time)
    room_no = Column(String(20))


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
