from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class OpsGrievance(Base):
    __tablename__ = "ops_grievances"

    ticket_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("sis_students.student_id"))
    category = Column(String(50))
    subject = Column(String(200), nullable=True)
    description = Column(Text)
    status = Column(String(20), default="Open")
    priority = Column(String(20), default="Normal")
    is_urgent = Column(Boolean, default=False)
    assigned_department = Column(String(100), nullable=True)
    resolution = Column(Text, nullable=True)
    satisfaction_rating = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    comments = relationship("OpsGrievanceComment", back_populates="grievance")


class OpsGrievanceComment(Base):
    __tablename__ = "ops_grievance_comments"

    comment_id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(Integer, ForeignKey("ops_grievances.ticket_id", ondelete="CASCADE"))
    user_id = Column(UUID(as_uuid=True), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    grievance = relationship("OpsGrievance", back_populates="comments")


class SisStudent(Base):
    __tablename__ = "sis_students"
    __table_args__ = {"extend_existing": True}

    student_id = Column(Integer, primary_key=True)
    user_id = Column(UUID(as_uuid=True))
    roll_no = Column(String(20))
