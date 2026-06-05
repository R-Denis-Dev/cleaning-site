from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint

from app.database import Base


class WeeklyCleaningCompletion(Base):
    """Засчитанная уборка пользователя за неделю (макс. 2 на неделю)."""

    __tablename__ = "weekly_cleaning_completions"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "week_start",
            "day_of_week",
            name="uq_user_week_cleaning_day",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=False)
    week_start = Column(Date, nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    photo_url = Column(String, nullable=True)
