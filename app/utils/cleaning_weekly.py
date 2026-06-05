from datetime import date

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.cleaning.models import WeeklyCleaningCompletion
from app.utils.week import week_start


def weekly_cleanings_count(db: Session, user_id: int, ws: date | None = None) -> int:
    ws = ws or week_start()
    return (
        db.query(WeeklyCleaningCompletion)
        .filter(
            WeeklyCleaningCompletion.user_id == user_id,
            WeeklyCleaningCompletion.week_start == ws,
        )
        .count()
    )


def weekly_cleanings_remaining(db: Session, user_id: int) -> int:
    settings = get_settings()
    used = weekly_cleanings_count(db, user_id)
    return max(0, settings.max_cleanings_per_week - used)


def find_completion(
    db: Session, user_id: int, day_of_week: int, ws: date | None = None
) -> WeeklyCleaningCompletion | None:
    ws = ws or week_start()
    return (
        db.query(WeeklyCleaningCompletion)
        .filter(
            WeeklyCleaningCompletion.user_id == user_id,
            WeeklyCleaningCompletion.week_start == ws,
            WeeklyCleaningCompletion.day_of_week == day_of_week,
        )
        .first()
    )


def revoke_cleaning_completion(
    db: Session, user, apartment, day_of_week: int
) -> bool:
    """Снимает засчитанную уборку при отмене последней задачи. Возвращает True если была запись."""
    completion = find_completion(db, user.id, day_of_week)
    if not completion:
        return False

    db.delete(completion)
    if user.total_cleanings > 0:
        user.total_cleanings -= 1
    if apartment and apartment.total_cleanings > 0:
        apartment.total_cleanings -= 1
    db.add(user)
    if apartment:
        db.add(apartment)
    return True
