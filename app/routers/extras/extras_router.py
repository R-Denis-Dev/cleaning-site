import uuid
from datetime import date, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_apartment_member, get_current_user
from app.models.cleaning.models import WeeklyCleaningCompletion
from app.models.extras.models import DaySwapRequest, TaskComment
from app.models.extras.schemas import (
    DaySwapCreate,
    DaySwapResponse,
    TaskCommentCreate,
    TaskCommentResponse,
)
from app.models.schedule.models import Schedule
from app.models.tasks.models import Task
from app.models.users.models import User
from app.services.notify import notify_event
from app.utils.week import week_start

router = APIRouter(prefix="/extras", tags=["extras"])
settings = get_settings()
ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.get("/tasks/{task_id}/comments", response_model=list[TaskCommentResponse])
def list_task_comments(
    task_id: int,
    db: Session = Depends(get_db),
    member=Depends(get_current_apartment_member),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.apartment_id != member.apartment_id:
        raise HTTPException(404, detail="Задача не найдена")
    comments = (
        db.query(TaskComment, User)
        .join(User, User.id == TaskComment.user_id)
        .filter(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at)
        .all()
    )
    return [
        TaskCommentResponse(
            id=c.id,
            task_id=c.task_id,
            user_id=c.user_id,
            username=u.username,
            text=c.text,
            created_at=c.created_at,
        )
        for c, u in comments
    ]


@router.post("/tasks/{task_id}/comments", response_model=TaskCommentResponse, status_code=201)
def add_task_comment(
    task_id: int,
    body: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task or task.apartment_id != member.apartment_id:
        raise HTTPException(404, detail="Задача не найдена")
    comment = TaskComment(
        task_id=task_id,
        user_id=current_user.id,
        text=body.text.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    notify_event(
        "task_comment",
        f"{current_user.username} оставил комментарий к задаче «{task.name}»",
        apartment_id=member.apartment_id,
        data={"task_id": task_id},
    )
    return TaskCommentResponse(
        id=comment.id,
        task_id=comment.task_id,
        user_id=comment.user_id,
        username=current_user.username,
        text=comment.text,
        created_at=comment.created_at,
    )


@router.get("/swap-requests", response_model=list[DaySwapResponse])
def list_swap_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    rows = (
        db.query(DaySwapRequest)
        .filter(
            DaySwapRequest.apartment_id == member.apartment_id,
            DaySwapRequest.status == "pending",
            or_(
                DaySwapRequest.requester_id == current_user.id,
                DaySwapRequest.target_user_id == current_user.id,
            ),
        )
        .order_by(DaySwapRequest.created_at.desc())
        .all()
    )
    out: list[DaySwapResponse] = []
    for r in rows:
        req = db.query(User).filter(User.id == r.requester_id).first()
        tgt = db.query(User).filter(User.id == r.target_user_id).first()
        out.append(
            DaySwapResponse(
                id=r.id,
                requester_id=r.requester_id,
                requester_username=req.username if req else "?",
                target_user_id=r.target_user_id,
                target_username=tgt.username if tgt else "?",
                requester_schedule_id=r.requester_schedule_id,
                target_schedule_id=r.target_schedule_id,
                status=r.status,
                created_at=r.created_at,
            )
        )
    return out


@router.post("/swap-requests", response_model=DaySwapResponse, status_code=201)
def create_swap_request(
    body: DaySwapCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    my_sched = (
        db.query(Schedule)
        .filter(
            Schedule.id == body.my_schedule_id,
            Schedule.apartment_id == member.apartment_id,
        )
        .first()
    )
    their_sched = (
        db.query(Schedule)
        .filter(
            Schedule.id == body.target_schedule_id,
            Schedule.apartment_id == member.apartment_id,
        )
        .first()
    )
    if not my_sched or not their_sched:
        raise HTTPException(404, detail="Расписание не найдено")
    if my_sched.user_id != current_user.id:
        raise HTTPException(400, detail="Вы можете обменять только свой занятый день")
    if their_sched.user_id != body.target_user_id:
        raise HTTPException(400, detail="Целевой день не принадлежит указанному жильцу")

    req = DaySwapRequest(
        apartment_id=member.apartment_id,
        requester_id=current_user.id,
        target_user_id=body.target_user_id,
        requester_schedule_id=body.my_schedule_id,
        target_schedule_id=body.target_schedule_id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    notify_event(
        "swap_request",
        f"{current_user.username} предлагает обменяться днями уборки",
        user_ids=[body.target_user_id],
        apartment_id=member.apartment_id,
        data={"swap_id": req.id},
    )
    tgt = db.query(User).filter(User.id == body.target_user_id).first()
    return DaySwapResponse(
        id=req.id,
        requester_id=req.requester_id,
        requester_username=current_user.username,
        target_user_id=req.target_user_id,
        target_username=tgt.username if tgt else "?",
        requester_schedule_id=req.requester_schedule_id,
        target_schedule_id=req.target_schedule_id,
        status=req.status,
        created_at=req.created_at,
    )


def _swap_schedules(db: Session, req: DaySwapRequest) -> None:
    a = db.query(Schedule).filter(Schedule.id == req.requester_schedule_id).first()
    b = db.query(Schedule).filter(Schedule.id == req.target_schedule_id).first()
    if not a or not b:
        raise HTTPException(404, detail="Расписание не найдено")
    a_uid, b_uid = a.user_id, b.user_id
    a.user_id, b.user_id = b_uid, a_uid
    a.is_taken = a.user_id is not None
    b.is_taken = b.user_id is not None


@router.post("/swap-requests/{swap_id}/accept", response_model=DaySwapResponse)
def accept_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    req = (
        db.query(DaySwapRequest)
        .filter(
            DaySwapRequest.id == swap_id,
            DaySwapRequest.apartment_id == member.apartment_id,
        )
        .first()
    )
    if not req or req.status != "pending":
        raise HTTPException(404, detail="Запрос не найден")
    if req.target_user_id != current_user.id:
        raise HTTPException(403, detail="Только получатель может принять обмен")

    _swap_schedules(db, req)
    req.status = "accepted"
    req.resolved_at = datetime.utcnow()
    db.commit()
    notify_event(
        "swap_accepted",
        f"{current_user.username} принял обмен днями",
        user_ids=[req.requester_id],
        apartment_id=member.apartment_id,
    )
    requester = db.query(User).filter(User.id == req.requester_id).first()
    return DaySwapResponse(
        id=req.id,
        requester_id=req.requester_id,
        requester_username=requester.username if requester else "?",
        target_user_id=req.target_user_id,
        target_username=current_user.username,
        requester_schedule_id=req.requester_schedule_id,
        target_schedule_id=req.target_schedule_id,
        status=req.status,
        created_at=req.created_at,
    )


@router.post("/swap-requests/{swap_id}/reject", status_code=204)
def reject_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    req = (
        db.query(DaySwapRequest)
        .filter(
            DaySwapRequest.id == swap_id,
            DaySwapRequest.apartment_id == member.apartment_id,
        )
        .first()
    )
    if not req or req.status != "pending":
        raise HTTPException(404, detail="Запрос не найден")
    if req.target_user_id != current_user.id:
        raise HTTPException(403, detail="Только получатель может отклонить")
    req.status = "rejected"
    req.resolved_at = datetime.utcnow()
    db.commit()
    notify_event(
        "swap_rejected",
        f"{current_user.username} отклонил обмен днями",
        user_ids=[req.requester_id],
        apartment_id=member.apartment_id,
    )


@router.post("/cleaning-photo/{day_of_week}")
async def upload_cleaning_photo(
    day_of_week: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(400, detail="day_of_week от 0 до 6")
    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(400, detail="Допустимы JPEG, PNG, WebP")

    content = await file.read()
    if len(content) > settings.max_avatar_bytes:
        raise HTTPException(400, detail="Файл слишком большой")

    ws = week_start(date.today())
    completion = (
        db.query(WeeklyCleaningCompletion)
        .filter(
            WeeklyCleaningCompletion.user_id == current_user.id,
            WeeklyCleaningCompletion.apartment_id == member.apartment_id,
            WeeklyCleaningCompletion.week_start == ws,
            WeeklyCleaningCompletion.day_of_week == day_of_week,
        )
        .first()
    )
    if not completion:
        raise HTTPException(
            400,
            detail="Сначала выполните все задачи дня — тогда можно прикрепить фото",
        )

    uploads_path = Path(settings.uploads_dir)
    uploads_path.mkdir(parents=True, exist_ok=True)
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }.get(file.content_type, ".jpg")
    filename = f"cleaning_{current_user.id}_{uuid.uuid4().hex}{ext}"
    (uploads_path / filename).write_bytes(content)
    completion.photo_url = f"/uploads/{filename}"
    db.commit()
    return {"photo_url": completion.photo_url}
