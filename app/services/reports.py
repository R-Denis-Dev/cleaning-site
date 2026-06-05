from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.cleaning.models import WeeklyCleaningCompletion
from app.models.schedule.models import Schedule
from app.models.tasks.models import Task
from app.models.users.models import User
from app.utils.week import week_start


def cleaning_history_for_apartment(
    db: Session, apartment_id: int, limit: int = 100
) -> list[dict]:
    rows = (
        db.query(WeeklyCleaningCompletion, User)
        .join(User, User.id == WeeklyCleaningCompletion.user_id)
        .filter(
            WeeklyCleaningCompletion.apartment_id == apartment_id,
            User.is_admin.is_(False),
        )
        .order_by(WeeklyCleaningCompletion.completed_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "username": u.username,
            "display_name": u.display_name,
            "apartment_id": c.apartment_id,
            "week_start": c.week_start,
            "day_of_week": c.day_of_week,
            "completed_at": c.completed_at,
            "photo_url": getattr(c, "photo_url", None),
        }
        for c, u in rows
    ]


def missed_cleanings_for_apartment(db: Session, apartment_id: int, ws: date) -> list[dict]:
    """Жильцы, занявшие день в расписании, но без засчитанной уборки за эту неделю/день."""
    schedules = (
        db.query(Schedule)
        .filter(
            Schedule.apartment_id == apartment_id,
            Schedule.week_start == ws,
            Schedule.is_taken.is_(True),
            Schedule.user_id.isnot(None),
        )
        .all()
    )
    completions = {
        (c.user_id, c.day_of_week)
        for c in db.query(WeeklyCleaningCompletion)
        .filter(
            WeeklyCleaningCompletion.apartment_id == apartment_id,
            WeeklyCleaningCompletion.week_start == ws,
        )
        .all()
    }
    result: list[dict] = []
    for s in schedules:
        if (s.user_id, s.day_of_week) in completions:
            continue
        user = db.query(User).filter(User.id == s.user_id).first()
        if not user or user.is_admin:
            continue
        result.append(
            {
                "user_id": user.id,
                "username": user.username,
                "display_name": user.display_name,
                "day_of_week": s.day_of_week,
                "week_start": ws,
            }
        )
    return result


def reminders_for_user(db: Session, user_id: int, apartment_id: int) -> list[dict]:
    today = date.today()
    tomorrow = today + timedelta(days=1)
    ws = week_start(today)
    items: list[dict] = []

    tomorrow_sched = (
        db.query(Schedule)
        .filter(
            Schedule.apartment_id == apartment_id,
            Schedule.week_start == ws,
            Schedule.day_of_week == tomorrow.weekday(),
            Schedule.user_id == user_id,
        )
        .first()
    )
    if tomorrow_sched:
        tasks = (
            db.query(Task)
            .filter(
                Task.apartment_id == apartment_id,
                Task.day_of_week == tomorrow.weekday(),
            )
            .all()
        )
        incomplete = sum(1 for t in tasks if not t.is_done)
        items.append(
            {
                "kind": "tomorrow_cleaning",
                "message": (
                    f"Завтра ваш день уборки"
                    + (f" — {incomplete} задач не сделано" if incomplete else "")
                ),
                "day_of_week": tomorrow.weekday(),
                "incomplete_tasks": incomplete,
            }
        )

    today_sched = (
        db.query(Schedule)
        .filter(
            Schedule.apartment_id == apartment_id,
            Schedule.week_start == ws,
            Schedule.day_of_week == today.weekday(),
            Schedule.user_id == user_id,
        )
        .first()
    )
    if today_sched:
        tasks = (
            db.query(Task)
            .filter(
                Task.apartment_id == apartment_id,
                Task.day_of_week == today.weekday(),
            )
            .all()
        )
        incomplete = sum(1 for t in tasks if not t.is_done)
        if incomplete:
            items.append(
                {
                    "kind": "today_cleaning",
                    "message": f"Сегодня ваш день — осталось {incomplete} задач",
                    "day_of_week": today.weekday(),
                    "incomplete_tasks": incomplete,
                }
            )

    return items
