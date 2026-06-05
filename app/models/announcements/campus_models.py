from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from app.database import Base


class CampusAnnouncement(Base):
    """Мероприятия и объявления Каллисто (только админы создают)."""

    __tablename__ = "campus_announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    event_at = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AnnouncementRead(Base):
    __tablename__ = "announcement_reads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    announcement_id = Column(
        Integer, ForeignKey("campus_announcements.id"), nullable=False, index=True
    )
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)
