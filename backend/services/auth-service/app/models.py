from sqlalchemy import Column, String, Boolean, Integer, Text, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class AuthUser(Base):
    __tablename__ = "auth_users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default="CURRENT_TIMESTAMP")
    last_login = Column(TIMESTAMP, nullable=True)

    roles = relationship("AuthUserRole", back_populates="user")


class AuthRole(Base):
    __tablename__ = "auth_roles"

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)

    user_roles = relationship("AuthUserRole", back_populates="role")


class AuthUserRole(Base):
    __tablename__ = "auth_user_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth_users.user_id", ondelete="CASCADE"))
    role_id = Column(Integer, ForeignKey("auth_roles.role_id", ondelete="CASCADE"))
    assigned_at = Column(TIMESTAMP, server_default="CURRENT_TIMESTAMP")

    user = relationship("AuthUser", back_populates="roles")
    role = relationship("AuthRole", back_populates="user_roles")


class AuthPermission(Base):
    __tablename__ = "auth_permissions"

    perm_id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("auth_roles.role_id", ondelete="CASCADE"))
    resource = Column(String(50))
    action_slug = Column(String(50))


class AuthApiKey(Base):
    __tablename__ = "auth_api_keys"

    key_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth_users.user_id", ondelete="CASCADE"))
    service_name = Column(String(100))
    api_key_hash = Column(String(255), nullable=False)
    expires_at = Column(TIMESTAMP, nullable=True)
