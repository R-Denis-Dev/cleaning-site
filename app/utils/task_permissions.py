from sqlalchemy.orm import Session

from app.models.schedule.models import Schedule
from app.utils.week import week_start
from datetime import date


def user_owns_cleaning_day(
    db: Session,
    user_id: int,
    apartment_id: int,
    day_of_week: int,
) -> bool:
    """Пользователь закреплён за этим днём в расписании на текущую неделю."""
    schedule = (
        db.query(Schedule)
        .filter(
            Schedule.apartment_id == apartment_id,
            Schedule.day_of_week == day_of_week,
            Schedule.week_start == week_start(date.today()),
            Schedule.user_id == user_id,
            Schedule.is_taken.is_(True),
        )
        .first()
    )
    return schedule is not None


def can_toggle_tasks_for_user(
    db: Session,
    user_id: int,
    apartment_id: int,
    day_of_week: int,
) -> bool:
    """Отмечать задачи можно на день, закреплённый за пользователем в расписании."""
    return user_owns_cleaning_day(db, user_id, apartment_id, day_of_week)
