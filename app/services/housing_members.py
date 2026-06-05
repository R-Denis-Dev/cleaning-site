from sqlalchemy.orm import Session

from app.models.schedule.models import Schedule
from app.utils.week import week_start


def release_user_schedules(db: Session, user_id: int, apartment_id: int) -> None:
    ws = week_start()
    schedules = (
        db.query(Schedule)
        .filter(
            Schedule.user_id == user_id,
            Schedule.apartment_id == apartment_id,
            Schedule.week_start == ws,
        )
        .all()
    )
    for s in schedules:
        s.user_id = None
        s.is_taken = False
