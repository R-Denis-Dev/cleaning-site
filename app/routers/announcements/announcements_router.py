import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.announcements.campus_models import AnnouncementRead, CampusAnnouncement
from app.models.admin.schemas import AnnouncementOut
from app.models.users.models import User
from app.services.notify import notify_event

router = APIRouter(prefix="/announcements", tags=["announcements"])
settings = get_settings()
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _save_announcement_image(file: UploadFile) -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, detail="Допустимы JPEG, PNG, WebP, GIF")
    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(file.content_type or "", ".jpg")
    uploads = Path(settings.uploads_dir) / "announcements"
    uploads.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    dest = uploads / name
    data = file.file.read()
    if len(data) > settings.max_avatar_bytes * 2:
        raise HTTPException(400, detail="Файл слишком большой")
    dest.write_bytes(data)
    return f"/uploads/announcements/{name}"


def _announcement_out(
    db: Session, row: CampusAnnouncement, user_id: int
) -> AnnouncementOut:
    creator = db.query(User).filter(User.id == row.created_by_id).first()
    read = (
        db.query(AnnouncementRead)
        .filter(
            AnnouncementRead.user_id == user_id,
            AnnouncementRead.announcement_id == row.id,
        )
        .first()
    )
    return AnnouncementOut(
        id=row.id,
        title=row.title,
        body=row.body,
        image_url=row.image_url,
        event_at=row.event_at,
        created_by_id=row.created_by_id,
        created_by_username=creator.username if creator else None,
        created_at=row.created_at,
        is_read=read is not None,
    )


@router.get("", response_model=list[AnnouncementOut])
def list_announcements(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(CampusAnnouncement)
        .order_by(CampusAnnouncement.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_announcement_out(db, r, current_user.id) for r in rows]


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    read_ids = [
        r.announcement_id
        for r in db.query(AnnouncementRead.announcement_id)
        .filter(AnnouncementRead.user_id == current_user.id)
        .all()
    ]
    query = db.query(CampusAnnouncement)
    if read_ids:
        query = query.filter(~CampusAnnouncement.id.in_(read_ids))
    return {"count": query.count()}


@router.post("/{announcement_id}/read", status_code=204)
def mark_read(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(CampusAnnouncement).filter(CampusAnnouncement.id == announcement_id).first()
    if not row:
        raise HTTPException(404, detail="Объявление не найдено")
    existing = (
        db.query(AnnouncementRead)
        .filter(
            AnnouncementRead.user_id == current_user.id,
            AnnouncementRead.announcement_id == announcement_id,
        )
        .first()
    )
    if not existing:
        db.add(
            AnnouncementRead(user_id=current_user.id, announcement_id=announcement_id)
        )
        db.commit()


@router.post("", response_model=AnnouncementOut, status_code=201)
async def create_announcement(
    title: str = Form(...),
    body: str = Form(...),
    event_at: str | None = Form(None),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    parsed_event: datetime | None = None
    if event_at and event_at.strip():
        try:
            parsed_event = datetime.fromisoformat(event_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(400, detail="Некорректная дата мероприятия") from None

    image_url: str | None = None
    if image and image.filename:
        image_url = _save_announcement_image(image)

    row = CampusAnnouncement(
        title=title.strip(),
        body=body.strip(),
        event_at=parsed_event,
        image_url=image_url,
        created_by_id=admin.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    notify_event(
        "campus_announcement",
        title.strip(),
        data={"announcement_id": row.id},
    )
    return _announcement_out(db, row, admin.id)


@router.delete("/{announcement_id}", status_code=204)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(CampusAnnouncement).filter(CampusAnnouncement.id == announcement_id).first()
    if not row:
        raise HTTPException(404, detail="Объявление не найдено")
    if row.image_url and row.image_url.startswith("/uploads/"):
        rel = row.image_url.removeprefix("/uploads/")
        path = Path(settings.uploads_dir) / rel
        if path.is_file():
            path.unlink(missing_ok=True)
    db.query(AnnouncementRead).filter(
        AnnouncementRead.announcement_id == announcement_id
    ).delete()
    db.delete(row)
    db.commit()
