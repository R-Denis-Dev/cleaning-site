import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_apartment_member, get_current_user, require_admin
from app.models.cleaning.schemas import (
    CleaningHistoryEntry,
    CleaningReminder,
    MissedCleaningEntry,
)
from app.models.users.models import User
from app.services.reports import (
    cleaning_history_for_apartment,
    missed_cleanings_for_apartment,
    reminders_for_user,
)
from app.utils.week import week_start

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/reminders", response_model=list[CleaningReminder])
def get_reminders(
    member=Depends(get_current_apartment_member),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return reminders_for_user(db, current_user.id, member.apartment_id)


@router.get("/cleaning-history", response_model=list[CleaningHistoryEntry])
def apartment_cleaning_history(
    limit: int = Query(50, le=200),
    member=Depends(get_current_apartment_member),
    db: Session = Depends(get_db),
):
    return cleaning_history_for_apartment(db, member.apartment_id, limit)


@router.get("/missed-cleanings", response_model=list[MissedCleaningEntry])
def apartment_missed_cleanings(
    week_start_param: date | None = Query(None, alias="week_start"),
    member=Depends(get_current_apartment_member),
    db: Session = Depends(get_db),
):
    ws = week_start_param or week_start()
    return missed_cleanings_for_apartment(db, member.apartment_id, ws)


@router.get("/admin/cleaning-export")
def export_cleaning_csv(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from app.models.cleaning.models import WeeklyCleaningCompletion

    rows = (
        db.query(WeeklyCleaningCompletion, User)
        .join(User, User.id == WeeklyCleaningCompletion.user_id)
        .order_by(WeeklyCleaningCompletion.completed_at.desc())
        .limit(5000)
        .all()
    )
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "id",
            "user_id",
            "username",
            "apartment_id",
            "week_start",
            "day_of_week",
            "completed_at",
        ]
    )
    for c, u in rows:
        writer.writerow(
            [
                c.id,
                c.user_id,
                u.username,
                c.apartment_id,
                c.week_start.isoformat(),
                c.day_of_week,
                c.completed_at.isoformat(),
            ]
        )
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cleaning_history.csv"},
    )
