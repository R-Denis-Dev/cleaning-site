import uuid
from pathlib import Path

import argon2
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.auth import create_access_token
from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.rewards.schemas import (
    EquipFrameRequest,
    FrameInfo,
    LeaderboardUserEntry,
    UserFramesResponse,
)
from app.models.users.models import User
from app.models.cleaning.schemas import (
    ForgotPasswordRequest,
    PasswordChangeRequest,
    ResetPasswordRequest,
)
from app.models.users.schemas import (
    AdminUserSearchResult,
    PublicUserResponse,
    TokenResponse,
    UserCreate,
    UserProfileUpdate,
    UserResponse,
)
from app.core.limiter import rate_limit
from app.core.password_reset import consume_reset_token, create_reset_code
from app.services.email import send_password_reset_email
from app.services.frames import (
    ALL_FRAMES,
    catalog_for_user,
    is_user_frame_unlocked,
    sanitize_user_equipped_frame,
)
from app.utils.admin_frames import ADMIN_FRAME_COLORS, ADMIN_FRAME_OFF, normalize_admin_frame_color
from app.utils.users import sync_admin_flag, user_apartment_info
from app.models.admin.models import AdminBonusTask
from app.models.admin.schemas import AdminFrameColorUpdate, UserBonusTaskOut

router = APIRouter()
password_hasher = argon2.PasswordHasher()
settings = get_settings()

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _to_user_response(db: Session, user: User) -> UserResponse:
    sanitize_user_equipped_frame(db, user)
    db.refresh(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        apartment=user_apartment_info(db, user.id),
        total_cleanings=user.total_cleanings,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        is_admin=user.is_admin,
        equipped_frame_code=user.equipped_frame_code,
        admin_frame_color=normalize_admin_frame_color(user.admin_frame_color)
        if user.is_admin
        else None,
        admin_frame_style=None,
    )


def _to_public_response(db: Session, user: User) -> PublicUserResponse:
    return PublicUserResponse(
        id=user.id,
        username=user.username,
        total_cleanings=user.total_cleanings,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        apartment=user_apartment_info(db, user.id),
        equipped_frame_code=user.equipped_frame_code,
        is_admin=user.is_admin,
        admin_frame_color=(
            normalize_admin_frame_color(user.admin_frame_color) if user.is_admin else None
        ),
        admin_frame_style=None,
    )


@router.patch("/users/me/admin-frame-color", response_model=UserResponse)
def update_admin_frame_color(
    body: AdminFrameColorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Только для администраторов")
    color = body.color.strip().lower()
    if color != ADMIN_FRAME_OFF and color not in ADMIN_FRAME_COLORS:
        raise HTTPException(400, detail="Недопустимый цвет обводки")
    current_user.admin_frame_color = color
    current_user.equipped_frame_code = None
    db.commit()
    db.refresh(current_user)
    return _to_user_response(db, current_user)


@router.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@rate_limit("10/hour")
def create_user(
    request: Request,
    user: UserCreate,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Имя пользователя уже занято")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=password_hasher.hash(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    sync_admin_flag(db_user, db)
    return _to_user_response(db, db_user)


@router.post("/users/login", response_model=TokenResponse)
@rate_limit("20/minute")
def login_user(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    from sqlalchemy import func, or_

    login_value = form_data.username.strip()
    db_user = (
        db.query(User)
        .filter(
            or_(
                User.username == login_value,
                func.lower(User.email) == login_value.lower(),
            )
        )
        .first()
    )
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин, email или пароль",
        )

    try:
        password_hasher.verify(db_user.hashed_password, form_data.password)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин, email или пароль",
        )

    if db_user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт заблокирован администрацией",
        )

    sync_admin_flag(db_user, db)
    access_token = create_access_token(db_user)
    return TokenResponse(
        access_token=access_token,
        user=_to_user_response(db, db_user),
    )


@router.get("/users/me", response_model=UserResponse)
def read_current_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sync_admin_flag(current_user, db)
    return _to_user_response(db, current_user)


@router.get("/users/me/bonus-tasks", response_model=list[UserBonusTaskOut])
def my_bonus_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.utils.week import week_start as ws_fn

    ws = ws_fn()
    rows = (
        db.query(AdminBonusTask)
        .filter(
            AdminBonusTask.user_id == current_user.id,
            AdminBonusTask.week_start == ws,
            AdminBonusTask.is_completed.is_(False),
        )
        .order_by(AdminBonusTask.created_at.desc())
        .all()
    )
    result: list[UserBonusTaskOut] = []
    for row in rows:
        admin = db.query(User).filter(User.id == row.assigned_by_id).first()
        result.append(
            UserBonusTaskOut(
                id=row.id,
                title=row.title,
                description=row.description,
                week_start=row.week_start,
                assigned_by_username=admin.username if admin else "admin",
                assigned_by_display_name=admin.display_name if admin else None,
                apartment_task_id=None,
                added_to_cleaning_day=False,
                created_at=row.created_at,
            )
        )
    return result


@router.get("/users/me/bonus-tasks/{bonus_id}", response_model=UserBonusTaskOut)
def my_bonus_task_detail(
    bonus_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(AdminBonusTask)
        .filter(AdminBonusTask.id == bonus_id, AdminBonusTask.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(404, detail="Задание не найдено")
    admin = db.query(User).filter(User.id == row.assigned_by_id).first()
    return UserBonusTaskOut(
        id=row.id,
        title=row.title,
        description=row.description,
        week_start=row.week_start,
        assigned_by_username=admin.username if admin else "admin",
        assigned_by_display_name=admin.display_name if admin else None,
        apartment_task_id=None,
        added_to_cleaning_day=False,
        created_at=row.created_at,
    )


@router.patch("/users/me", response_model=UserResponse)
def update_current_user(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.display_name is not None:
        current_user.display_name = body.display_name.strip() or None
    if body.bio is not None:
        current_user.bio = body.bio.strip() or None
    db.commit()
    db.refresh(current_user)
    return _to_user_response(db, current_user)


@router.get("/users/me/frames", response_model=UserFramesResponse)
def get_my_frames(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sanitize_user_equipped_frame(db, current_user)
    db.refresh(current_user)
    return UserFramesResponse(
        equipped_frame_code=current_user.equipped_frame_code,
        frames=[FrameInfo(**f) for f in catalog_for_user(db, current_user)],
    )


@router.patch("/users/me/frame", response_model=UserResponse)
def equip_user_frame(
    body: EquipFrameRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    code = body.frame_code
    if code is not None:
        if code not in ALL_FRAMES or ALL_FRAMES[code].target != "user":
            raise HTTPException(400, detail="Неизвестная рамка")
        if not is_user_frame_unlocked(db, current_user, code):
            raise HTTPException(403, detail="Рамка ещё не разблокирована")

    current_user.equipped_frame_code = code
    db.commit()
    db.refresh(current_user)
    return _to_user_response(db, current_user)


@router.post("/users/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(400, detail="Допустимы только JPEG, PNG, WebP или GIF")

    content = await file.read()
    if len(content) > settings.max_avatar_bytes:
        raise HTTPException(400, detail="Файл слишком большой (макс. 2 МБ)")

    uploads_path = Path(settings.uploads_dir)
    uploads_path.mkdir(parents=True, exist_ok=True)

    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(file.content_type, ".jpg")
    filename = f"avatar_{current_user.id}_{uuid.uuid4().hex}{ext}"
    filepath = uploads_path / filename
    filepath.write_bytes(content)

    current_user.avatar_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(current_user)
    return _to_user_response(db, current_user)


@router.get("/users/leaderboard", response_model=list[LeaderboardUserEntry])
def leaderboard(
    limit: int = 10,
    period: str = "all",
    building_code: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import timedelta
    from sqlalchemy import func

    from app.models.cleaning.models import WeeklyCleaningCompletion
    from app.models.housing.models import Apartment, ApartmentMember, Building
    from app.utils.week import week_start as ws_fn

    cap = min(max(limit, 1), 50)
    today = __import__("datetime").date.today()

    if period in ("week", "month", "semester"):
        if period == "week":
            since = ws_fn(today)
        elif period == "month":
            since = today.replace(day=1)
        else:
            since = today - timedelta(days=120)
        q = (
            db.query(
                User,
                func.count(WeeklyCleaningCompletion.id).label("cnt"),
            )
            .join(
                WeeklyCleaningCompletion,
                WeeklyCleaningCompletion.user_id == User.id,
            )
            .filter(
                WeeklyCleaningCompletion.completed_at >= since,
                User.is_admin.is_(False),
            )
        )
        if building_code:
            q = (
                q.join(ApartmentMember, ApartmentMember.user_id == User.id)
                .join(Apartment, Apartment.id == ApartmentMember.apartment_id)
                .join(Building, Building.id == Apartment.building_id)
                .filter(Building.code == building_code.upper())
            )
        rows = q.group_by(User.id).order_by(func.count(WeeklyCleaningCompletion.id).desc()).limit(cap).all()
        result: list[LeaderboardUserEntry] = []
        for rank, (u, cnt) in enumerate(rows, start=1):
            if cnt <= 0 or u.is_admin:
                continue
            pub = _to_public_response(db, u)
            data = pub.model_dump()
            data["total_cleanings"] = int(cnt)
            result.append(LeaderboardUserEntry(**data, rank=rank))
        return result

    users_q = db.query(User).filter(
        User.total_cleanings > 0,
        User.is_admin.is_(False),
    )
    if building_code:
        users_q = (
            users_q.join(ApartmentMember, ApartmentMember.user_id == User.id)
            .join(Apartment, Apartment.id == ApartmentMember.apartment_id)
            .join(Building, Building.id == Apartment.building_id)
            .filter(Building.code == building_code.upper())
        )
    users = users_q.order_by(User.total_cleanings.desc()).limit(cap).all()
    return [
        LeaderboardUserEntry(
            **_to_public_response(db, u).model_dump(),
            rank=rank,
        )
        for rank, u in enumerate(users, start=1)
    ]


@router.patch("/users/me/password", status_code=204)
def change_password(
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        password_hasher.verify(current_user.hashed_password, body.current_password)
    except Exception:
        raise HTTPException(400, detail="Неверный текущий пароль")
    if len(body.new_password) < 6:
        raise HTTPException(400, detail="Пароль не короче 6 символов")
    current_user.hashed_password = password_hasher.hash(body.new_password)
    db.commit()


@router.post("/users/forgot-password")
@rate_limit("5/hour")
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == body.email).first()
    payload: dict = {
        "message": "Если email зарегистрирован, на почту отправлен код подтверждения"
    }
    if user:
        code = create_reset_code(db, user)
        sent = send_password_reset_email(user.email, code, user.username)
        if not sent:
            if settings.expose_reset_token:
                payload["dev_code"] = code
                payload["message"] = (
                    "SMTP не настроен — код показан только в режиме разработки"
                )
            else:
                raise HTTPException(
                    503,
                    detail="Не удалось отправить письмо. Обратитесь к администратору.",
                )
    return payload


@router.post("/users/reset-password", status_code=204)
@rate_limit("10/hour")
def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    user = consume_reset_token(db, body.code)
    if not user:
        raise HTTPException(400, detail="Неверный или просроченный код")
    if len(body.new_password) < 6:
        raise HTTPException(400, detail="Пароль не короче 6 символов")
    user.hashed_password = password_hasher.hash(body.new_password)
    db.commit()


@router.post("/users/me/bonus-tasks/{bonus_id}/complete", status_code=204)
def complete_my_bonus_task(
    bonus_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from datetime import datetime

    row = (
        db.query(AdminBonusTask)
        .filter(AdminBonusTask.id == bonus_id, AdminBonusTask.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(404, detail="Задание не найдено")
    if row.is_completed:
        return None
    row.is_completed = True
    row.completed_at = datetime.utcnow()
    db.commit()


@router.get("/users/callisto-admins", response_model=list[PublicUserResponse])
def list_callisto_admins(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    admins = (
        db.query(User)
        .filter(User.is_admin.is_(True), User.is_blocked.is_(False))
        .order_by(User.username)
        .all()
    )
    return [_to_public_response(db, u) for u in admins]


@router.get("/users/{user_id}", response_model=PublicUserResponse)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return _to_public_response(db, user)


@router.get("/users/{user_id}/admin", response_model=AdminUserSearchResult)
def read_user_admin(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return AdminUserSearchResult(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        total_cleanings=user.total_cleanings,
        created_at=user.created_at,
        is_admin=user.is_admin,
        apartment=user_apartment_info(db, user.id),
    )
