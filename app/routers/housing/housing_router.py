from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.dependencies import (
    get_current_apartment_member,
    get_current_user,
    require_manager,
)
from app.models.housing.models import Apartment, ApartmentMember, Building
from app.models.housing.schemas import (
    ApartmentDescriptionUpdate,
    ApartmentDetailResponse,
    ApartmentMemberResponse,
    ApartmentResponse,
    ApartmentSearchResult,
    BuildingResponse,
    CleaningModeUpdate,
)
from app.models.rewards.schemas import EquipFrameRequest, LeaderboardApartmentEntry
from app.services.frames import (
    ALL_FRAMES,
    catalog_for_apartment,
    is_apartment_frame_unlocked,
    sanitize_apartment_equipped_frame,
)
from app.models.inspections.models import ApartmentInspection
from app.models.inspections.schemas import InspectionResponse
from app.services.inspections import inspection_to_response
from app.models.schedule.models import Schedule
from app.models.users.models import User
from app.services.housing_members import release_user_schedules
from app.services.tasks import sync_default_tasks_for_apartment
from app.utils.week import week_start

router = APIRouter(prefix="/housing", tags=["housing"])
settings = get_settings()
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

BUILDING_CODES = ["C1", "C2", "R1", "R2", "R3", "R4", "R5", "R6"]


def seed_buildings_and_apartments(db: Session) -> None:
    if db.query(Building).count():
        return
    for code in BUILDING_CODES:
        building = Building(code=code, name=code)
        db.add(building)
        db.flush()
        for number in range(1, 97):
            db.add(Apartment(building_id=building.id, number=number))
    db.commit()


def _apartment_response(apartment: Apartment, building_code: str) -> ApartmentResponse:
    return ApartmentResponse(
        id=apartment.id,
        number=apartment.number,
        building_code=building_code,
        current_residents=len(apartment.members),
        max_residents=apartment.max_residents,
        use_default_tasks=apartment.use_default_tasks,
        cleaning_mode=getattr(apartment, "cleaning_mode", None) or "general",
        description=apartment.description,
        description_updated_at=apartment.description_updated_at,
        total_cleanings=apartment.total_cleanings,
        equipped_frame_code=apartment.equipped_frame_code,
        avatar_url=apartment.avatar_url,
    )


@router.get("/buildings", response_model=list[BuildingResponse])
def get_buildings(db: Session = Depends(get_db)):
    seed_buildings_and_apartments(db)
    return db.query(Building).order_by(Building.code).all()


@router.get("/search", response_model=list[ApartmentSearchResult])
def search_apartments(
    building_code: str | None = None,
    apartment_number: int | None = None,
    q: str | None = Query(None, description="Поиск по номеру или коду корпуса"),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    seed_buildings_and_apartments(db)
    query = (
        db.query(Apartment)
        .join(Building)
        .options(joinedload(Apartment.members), joinedload(Apartment.building))
    )

    if building_code:
        query = query.filter(Building.code == building_code.upper())
    if apartment_number is not None:
        query = query.filter(Apartment.number == apartment_number)
    if q:
        q = q.strip().upper()
        if q.isdigit():
            query = query.filter(Apartment.number == int(q))
        else:
            query = query.filter(Building.code.ilike(f"%{q}%"))

    apartments = query.limit(limit).all()
    results: list[ApartmentSearchResult] = []
    for apt in apartments:
        desc = apt.description
        preview = (desc[:120] + "…") if desc and len(desc) > 120 else desc
        results.append(
            ApartmentSearchResult(
                id=apt.id,
                number=apt.number,
                building_code=apt.building.code,
                building_name=apt.building.name,
                current_residents=len(apt.members),
                max_residents=apt.max_residents,
                description_preview=preview,
                avatar_url=apt.avatar_url,
                equipped_frame_code=apt.equipped_frame_code,
                total_cleanings=apt.total_cleanings,
            )
        )
    return results


# --- Маршруты /apartments/me должны быть ДО /apartments/{apartment_id} ---


@router.get("/apartments/me", response_model=ApartmentResponse)
def get_my_apartment(
    member=Depends(get_current_apartment_member),
    db: Session = Depends(get_db),
):
    apartment = (
        db.query(Apartment)
        .options(joinedload(Apartment.building), joinedload(Apartment.members))
        .filter(Apartment.id == member.apartment_id)
        .first()
    )
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")
    return _apartment_response(apartment, apartment.building.code)


@router.get("/apartments/me/members", response_model=list[ApartmentMemberResponse])
def get_my_apartment_members(
    member=Depends(get_current_apartment_member),
    db: Session = Depends(get_db),
):
    members = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.apartment_id == member.apartment_id)
        .all()
    )
    return [
        ApartmentMemberResponse(
            user_id=m.user_id,
            username=m.user.username,
            display_name=m.user.display_name,
            avatar_url=m.user.avatar_url,
            role=m.role,
            equipped_frame_code=m.user.equipped_frame_code,
        )
        for m in members
    ]


@router.post("/apartments/me/leave", status_code=204)
def leave_apartment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.user_id == current_user.id)
        .first()
    )
    if not member:
        raise HTTPException(400, detail="Вы не состоите в квартире")

    apartment_id = member.apartment_id
    release_user_schedules(db, current_user.id, apartment_id)

    managers_count = (
        db.query(ApartmentMember)
        .filter(
            ApartmentMember.apartment_id == apartment_id,
            ApartmentMember.role == "manager",
        )
        .count()
    )
    if member.role == "manager" and managers_count <= 1:
        next_member = (
            db.query(ApartmentMember)
            .filter(
                ApartmentMember.apartment_id == apartment_id,
                ApartmentMember.user_id != current_user.id,
            )
            .first()
        )
        if next_member:
            next_member.role = "manager"

    db.delete(member)
    db.commit()


@router.patch("/apartments/me/description", response_model=ApartmentResponse)
def update_apartment_description(
    body: ApartmentDescriptionUpdate,
    db: Session = Depends(get_db),
    member=Depends(get_current_apartment_member),
):
    apartment = (
        db.query(Apartment)
        .options(joinedload(Apartment.building))
        .filter(Apartment.id == member.apartment_id)
        .first()
    )
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")

    apartment.description = body.description.strip()
    apartment.description_updated_at = datetime.utcnow()
    apartment.description_updated_by_id = member.user_id
    db.commit()
    db.refresh(apartment)
    return _apartment_response(apartment, apartment.building.code)


@router.post("/apartments/me/use-default-tasks")
def set_use_default_tasks(
    use_default: bool,
    db: Session = Depends(get_db),
    member=Depends(require_manager),
):
    apartment = db.query(Apartment).filter(Apartment.id == member.apartment_id).first()
    if not apartment:
        raise HTTPException(status_code=404, detail="Квартира не найдена")

    apartment.use_default_tasks = use_default
    db.add(apartment)
    db.commit()
    sync_default_tasks_for_apartment(db, member.apartment_id)
    db.refresh(apartment)

    return {"use_default_tasks": apartment.use_default_tasks}


@router.post("/apartments/me/cleaning-mode")
def set_cleaning_mode(
    body: CleaningModeUpdate,
    db: Session = Depends(get_db),
    member=Depends(require_manager),
):
    apartment = db.query(Apartment).filter(Apartment.id == member.apartment_id).first()
    if not apartment:
        raise HTTPException(status_code=404, detail="Квартира не найдена")

    apartment.cleaning_mode = body.mode
    apartment.use_default_tasks = True
    db.add(apartment)
    db.commit()
    sync_default_tasks_for_apartment(db, member.apartment_id)
    db.refresh(apartment)

    return {
        "cleaning_mode": apartment.cleaning_mode,
        "use_default_tasks": apartment.use_default_tasks,
    }


@router.get("/apartments/{apartment_id}", response_model=ApartmentDetailResponse)
def get_apartment_detail(
    apartment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    apartment = (
        db.query(Apartment)
        .options(
            joinedload(Apartment.building),
            joinedload(Apartment.members).joinedload(ApartmentMember.user),
        )
        .filter(Apartment.id == apartment_id)
        .first()
    )
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")

    inspections_count = (
        db.query(ApartmentInspection)
        .filter(ApartmentInspection.apartment_id == apartment_id)
        .count()
    )

    return ApartmentDetailResponse(
        **_apartment_response(apartment, apartment.building.code).model_dump(),
        members=[
            ApartmentMemberResponse(
                user_id=m.user_id,
                username=m.user.username,
                display_name=m.user.display_name,
                avatar_url=m.user.avatar_url,
                role=m.role,
                equipped_frame_code=m.user.equipped_frame_code,
            )
            for m in apartment.members
        ],
        recent_inspections_count=inspections_count,
    )


@router.get("/apartments/{apartment_id}/inspections", response_model=list[InspectionResponse])
def get_apartment_inspections(
    apartment_id: int,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    member = (
        db.query(ApartmentMember)
        .filter(
            ApartmentMember.user_id == current_user.id,
            ApartmentMember.apartment_id == apartment_id,
        )
        .first()
    )
    if not member and not current_user.is_admin:
        raise HTTPException(403, detail="Нет доступа")

    inspections = (
        db.query(ApartmentInspection)
        .options(joinedload(ApartmentInspection.violations))
        .filter(ApartmentInspection.apartment_id == apartment_id)
        .order_by(ApartmentInspection.created_at.desc())
        .limit(limit)
        .all()
    )
    return [inspection_to_response(db, i) for i in inspections]


@router.get("/buildings/{code}/apartments", response_model=list[ApartmentResponse])
def get_apartments_by_building(
    code: str,
    number: int | None = None,
    db: Session = Depends(get_db),
):
    building = db.query(Building).filter(Building.code == code).first()
    if not building:
        raise HTTPException(404, detail="Корпус не найден")

    query = db.query(Apartment).filter(Apartment.building_id == building.id)
    if number is not None:
        query = query.filter(Apartment.number == number)
    apartments = query.all()
    return [_apartment_response(apt, building.code) for apt in apartments]


@router.post("/apartments/{apartment_id}/join", response_model=ApartmentMemberResponse)
def join_apartment(
    apartment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        raise HTTPException(400, detail="Администратор не выбирает квартиру")
    apartment = db.query(Apartment).filter(Apartment.id == apartment_id).first()
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")

    if (
        db.query(ApartmentMember)
        .filter(ApartmentMember.user_id == current_user.id)
        .first()
    ):
        raise HTTPException(400, detail="Вы уже состоите в квартире")

    residents_count = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.apartment_id == apartment.id)
        .count()
    )
    if residents_count >= apartment.max_residents:
        raise HTTPException(400, detail="Квартира заполнена")

    role = "manager" if residents_count == 0 else "resident"
    member = ApartmentMember(
        user_id=current_user.id,
        apartment_id=apartment.id,
        role=role,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return ApartmentMemberResponse(
        user_id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        role=member.role,
        equipped_frame_code=current_user.equipped_frame_code,
    )


@router.post("/apartments/{apartment_id}/move", response_model=ApartmentMemberResponse)
def move_to_apartment(
    apartment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        raise HTTPException(400, detail="Администратор не выбирает квартиру")
    new_apartment = db.query(Apartment).filter(Apartment.id == apartment_id).first()
    if not new_apartment:
        raise HTTPException(404, detail="Квартира не найдена")

    residents_count = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.apartment_id == new_apartment.id)
        .count()
    )
    if residents_count >= new_apartment.max_residents:
        raise HTTPException(400, detail="Квартира заполнена")

    member = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.user_id == current_user.id)
        .first()
    )

    if member:
        if member.apartment_id == new_apartment.id:
            raise HTTPException(400, detail="Вы уже живёте в этой квартире")
        old_apartment_id = member.apartment_id
        release_user_schedules(db, current_user.id, old_apartment_id)
        member.apartment_id = new_apartment.id
        member.role = "resident" if residents_count > 0 else "manager"
    else:
        role = "manager" if residents_count == 0 else "resident"
        member = ApartmentMember(
            user_id=current_user.id,
            apartment_id=new_apartment.id,
            role=role,
        )
        db.add(member)

    db.commit()
    db.refresh(member)

    return ApartmentMemberResponse(
        user_id=current_user.id,
        username=current_user.username,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        role=member.role,
        equipped_frame_code=current_user.equipped_frame_code,
    )


@router.delete("/apartments/{apartment_id}/members/{user_id}", status_code=204)
def remove_member(
    apartment_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    manager=Depends(require_manager),
):
    if manager.apartment_id != apartment_id:
        raise HTTPException(403, detail="Нет доступа")

    member = (
        db.query(ApartmentMember)
        .filter(
            ApartmentMember.apartment_id == apartment_id,
            ApartmentMember.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(404, detail="Жилец не найден")

    if member.user_id == manager.user_id:
        raise HTTPException(400, detail="Используйте «Покинуть квартиру» для себя")

    release_user_schedules(db, user_id, apartment_id)
    db.delete(member)
    db.commit()


@router.get("/leaderboard", response_model=list[LeaderboardApartmentEntry])
def apartments_leaderboard(
    limit: int = 10,
    period: str = "all",
    building_code: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import timedelta
    from sqlalchemy import func

    from app.models.cleaning.models import WeeklyCleaningCompletion
    from app.utils.week import week_start as ws_fn

    seed_buildings_and_apartments(db)
    cap = min(max(limit, 1), 50)
    from datetime import date as date_cls

    today = date_cls.today()

    if period in ("week", "month", "semester"):
        if period == "week":
            since = ws_fn(today)
        elif period == "month":
            since = today.replace(day=1)
        else:
            since = today - timedelta(days=120)
        q = (
            db.query(
                Apartment,
                func.count(WeeklyCleaningCompletion.id).label("cnt"),
            )
            .join(
                WeeklyCleaningCompletion,
                WeeklyCleaningCompletion.apartment_id == Apartment.id,
            )
            .join(Building)
            .filter(WeeklyCleaningCompletion.completed_at >= since)
        )
        if building_code:
            q = q.filter(Building.code == building_code.upper())
        rows = (
            q.options(joinedload(Apartment.building), joinedload(Apartment.members))
            .group_by(Apartment.id)
            .order_by(func.count(WeeklyCleaningCompletion.id).desc())
            .limit(cap)
            .all()
        )
        result_period: list[LeaderboardApartmentEntry] = []
        for rank, (apt, cnt) in enumerate(rows, start=1):
            if cnt <= 0:
                continue
            result_period.append(
                LeaderboardApartmentEntry(
                    id=apt.id,
                    building_code=apt.building.code,
                    apartment_number=apt.number,
                    total_cleanings=int(cnt),
                    equipped_frame_code=apt.equipped_frame_code,
                    avatar_url=apt.avatar_url,
                    current_residents=len(apt.members),
                    rank=rank,
                )
            )
        return result_period

    apt_q = (
        db.query(Apartment)
        .join(Building)
        .options(joinedload(Apartment.building), joinedload(Apartment.members))
        .filter(Apartment.total_cleanings > 0)
    )
    if building_code:
        apt_q = apt_q.filter(Building.code == building_code.upper())
    apartments = apt_q.order_by(Apartment.total_cleanings.desc()).limit(cap).all()
    result: list[LeaderboardApartmentEntry] = []
    for rank, apt in enumerate(apartments, start=1):
        if apt.total_cleanings <= 0:
            continue
        result.append(
            LeaderboardApartmentEntry(
                id=apt.id,
                building_code=apt.building.code,
                apartment_number=apt.number,
                total_cleanings=apt.total_cleanings,
                equipped_frame_code=apt.equipped_frame_code,
                avatar_url=apt.avatar_url,
                current_residents=len(apt.members),
                rank=rank,
            )
        )
    return result


@router.get("/apartments/me/frames")
def get_my_apartment_frames(
    member=Depends(get_current_apartment_member),
    db: Session = Depends(get_db),
):
    apartment = db.query(Apartment).filter(Apartment.id == member.apartment_id).first()
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")
    sanitize_apartment_equipped_frame(db, apartment)
    db.refresh(apartment)
    return {
        "equipped_frame_code": apartment.equipped_frame_code,
        "frames": catalog_for_apartment(db, apartment),
    }


@router.patch("/apartments/me/frame", response_model=ApartmentResponse)
def equip_apartment_frame(
    body: EquipFrameRequest,
    member=Depends(get_current_apartment_member),
    db: Session = Depends(get_db),
):
    apartment = (
        db.query(Apartment)
        .options(joinedload(Apartment.building), joinedload(Apartment.members))
        .filter(Apartment.id == member.apartment_id)
        .first()
    )
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")

    code = body.frame_code
    if code is not None:
        if code not in ALL_FRAMES or ALL_FRAMES[code].target != "apartment":
            raise HTTPException(400, detail="Неизвестная рамка квартиры")
        if not is_apartment_frame_unlocked(db, apartment, code):
            raise HTTPException(403, detail="Рамка ещё не разблокирована")

    apartment.equipped_frame_code = code
    db.commit()
    db.refresh(apartment)
    return _apartment_response(apartment, apartment.building.code)


@router.post("/apartments/me/avatar", response_model=ApartmentResponse)
async def upload_apartment_avatar(
    file: UploadFile = File(...),
    member=Depends(get_current_apartment_member),
    db: Session = Depends(get_db),
):
    import uuid
    from pathlib import Path

    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(400, detail="Допустимы только JPEG, PNG, WebP или GIF")

    content = await file.read()
    if len(content) > settings.max_avatar_bytes:
        raise HTTPException(400, detail="Файл слишком большой (макс. 2 МБ)")

    apartment = (
        db.query(Apartment)
        .options(joinedload(Apartment.building), joinedload(Apartment.members))
        .filter(Apartment.id == member.apartment_id)
        .first()
    )
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")

    uploads_path = Path(settings.uploads_dir)
    uploads_path.mkdir(parents=True, exist_ok=True)

    ext = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }.get(file.content_type, ".jpg")
    filename = f"apt_avatar_{apartment.id}_{uuid.uuid4().hex}{ext}"
    (uploads_path / filename).write_bytes(content)

    apartment.avatar_url = f"/uploads/{filename}"
    db.commit()
    db.refresh(apartment)
    return _apartment_response(apartment, apartment.building.code)
