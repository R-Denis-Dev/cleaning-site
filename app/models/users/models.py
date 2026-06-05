from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_total_cleanings", "total_cleanings"),)

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    total_cleanings = Column(Integer, default=0, nullable=False)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    equipped_frame_code = Column(String(64), nullable=True)
    admin_frame_color = Column(String(16), nullable=True, default="white")
    admin_frame_style = Column(String(24), nullable=True, default="crown")

    # один к одному с ApartmentMember
    apartment_member = relationship(
        "ApartmentMember",
        back_populates="user",
        uselist=False,
    )

    # один ко многим с Schedule
    schedules = relationship(
        "Schedule",
        back_populates="user",
    )
