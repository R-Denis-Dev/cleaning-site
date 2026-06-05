from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import require_admin
from app.models.admin.models import AdminBonusTask
from app.models.admin.schemas import (
    AdminApartmentMember,
    AdminApartmentOverview,
    AdminBonusTaskCreate,
    AdminBonusTaskOut,
    AdminResidentListItem,
    AdminUserRatingUpdate,
    AdminUserStats,
)
from app.models.housing.models import Apartment, ApartmentMember, Building
from app.models.inspections.models import ApartmentInspection, InspectionViolation
from app.models.inspections.schemas import (
    InspectionCreate,
    InspectionResponse,
    InspectionUpdate,
    ViolationCreate,
    ViolationResponse,
)
from app.models.extras.models import UserBuildingRole
from app.models.extras.schemas import BuildingRoleAssign
from app.models.users.models import User
from app.models.users.schemas import AdminUserSearchResult
from app.services.admin_actions import (
    admin_block_user,
    admin_remove_from_apartment,
    admin_set_manager,
    admin_unblock_user,
)
from app.services.inspections import inspection_to_response
from app.services.notify import notify_event
from app.models.tasks.models import Task
from app.utils.admin_frames import normalize_admin_frame_color
from app.utils.users import user_apartment_info
from app.utils.week import week_start

router = APIRouter(prefix="/admin", tags=["admin"])


def _bonus_task_out(db: Session, bonus: AdminBonusTask) -> AdminBonusTaskOut:
    admin = db.query(User).filter(User.id == bonus.assigned_by_id).first()
    return AdminBonusTaskOut(
        id=bonus.id,
        user_id=bonus.user_id,
        title=bonus.title,
        description=bonus.description,
        week_start=bonus.week_start,
        apartment_task_id=bonus.apartment_task_id,
        assigned_by_username=admin.username if admin else "admin",
        assigned_by_display_name=admin.display_name if admin else None,
        created_at=bonus.created_at,
    )


def _user_search_result(db: Session, u: User) -> AdminUserSearchResult:
    return AdminUserSearchResult(
        id=u.id,
        username=u.username,
        email=u.email,
        display_name=u.display_name,
        avatar_url=u.avatar_url,
        bio=u.bio,
        total_cleanings=u.total_cleanings,
        created_at=u.created_at,
        is_admin=u.is_admin,
        equipped_frame_code=u.equipped_frame_code if not u.is_admin else None,
        admin_frame_color=normalize_admin_frame_color(u.admin_frame_color) if u.is_admin else None,
        admin_frame_style=None,
        apartment=user_apartment_info(db, u.id),
    )


@router.get("/residents", response_model=list[AdminResidentListItem])
def list_residents(
    q: str | None = Query(None, min_length=1),
    in_apartment_only: bool = False,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User).outerjoin(
        ApartmentMember, ApartmentMember.user_id == User.id
    )
    if in_apartment_only:
        query = query.filter(ApartmentMember.id.isnot(None))
    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.display_name.ilike(pattern),
            )
        )
    users = query.distinct().order_by(User.username).limit(limit).all()
    return [
        AdminResidentListItem(
            **_user_search_result(db, u).model_dump(),
            is_blocked=u.is_blocked,
        )
        for u in users
    ]


@router.get("/apartments", response_model=list[AdminApartmentOverview])
def list_apartments_overview(
    building_code: str | None = None,
    q: str | None = None,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = (
        db.query(Apartment)
        .join(Building)
        .options(joinedload(Apartment.members), joinedload(Apartment.building))
        .order_by(Building.code, Apartment.number)
    )
    if building_code:
        query = query.filter(Building.code == building_code.upper())
    if q and q.strip().isdigit():
        query = query.filter(Apartment.number == int(q.strip()))
    apartments = query.limit(limit).all()
    result: list[AdminApartmentOverview] = []
    for apt in apartments:
        violations_count = (
            db.query(func.count(InspectionViolation.id))
            .join(ApartmentInspection)
            .filter(ApartmentInspection.apartment_id == apt.id)
            .scalar()
            or 0
        )
        pending = (
            db.query(func.count(ApartmentInspection.id))
            .filter(
                ApartmentInspection.apartment_id == apt.id,
                ApartmentInspection.status == "pending",
            )
            .scalar()
            or 0
        )
        manager = next((m for m in apt.members if m.role == "manager"), None)
        manager_name = None
        if manager:
            mu = db.query(User).filter(User.id == manager.user_id).first()
            manager_name = mu.display_name or mu.username if mu else None
        result.append(
            AdminApartmentOverview(
                id=apt.id,
                building_code=apt.building.code,
                number=apt.number,
                current_residents=len(apt.members),
                max_residents=apt.max_residents,
                total_cleanings=apt.total_cleanings,
                violations_count=violations_count,
                pending_inspections=pending,
                manager_username=manager_name,
            )
        )
    return result


@router.get("/apartments/{apartment_id}/members", response_model=list[AdminApartmentMember])
def apartment_members(
    apartment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    apt = db.query(Apartment).filter(Apartment.id == apartment_id).first()
    if not apt:
        raise HTTPException(404, detail="Квартира не найдена")
    members = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.apartment_id == apartment_id)
        .all()
    )
    out: list[AdminApartmentMember] = []
    for m in members:
        u = db.query(User).filter(User.id == m.user_id).first()
        if not u:
            continue
        out.append(
            AdminApartmentMember(
                user_id=u.id,
                username=u.username,
                display_name=u.display_name,
                avatar_url=u.avatar_url,
                role=m.role,
                total_cleanings=u.total_cleanings,
                is_admin=u.is_admin,
                is_blocked=u.is_blocked,
                equipped_frame_code=u.equipped_frame_code if not u.is_admin else None,
                admin_frame_color=(
                    normalize_admin_frame_color(u.admin_frame_color) if u.is_admin else None
                ),
                admin_frame_style=None,
            )
        )
    return out


@router.delete("/apartments/{apartment_id}/members/{user_id}", status_code=204)
def admin_kick_member(
    apartment_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    admin_remove_from_apartment(db, user_id, apartment_id)


@router.post("/apartments/{apartment_id}/manager/{user_id}", status_code=204)
def admin_assign_manager(
    apartment_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        admin_set_manager(db, apartment_id, user_id)
    except ValueError as e:
        raise HTTPException(400, detail=str(e)) from e


@router.post("/users/{user_id}/block", status_code=204)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(400, detail="Нельзя заблокировать себя")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")
    if user.is_admin:
        raise HTTPException(400, detail="Нельзя заблокировать администратора")
    admin_block_user(db, user)
    notify_event("user_blocked", f"Пользователь {user.username} заблокирован", data={"user_id": user_id})


@router.post("/users/{user_id}/unblock", status_code=204)
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")
    admin_unblock_user(db, user)


@router.get("/users/{user_id}/stats", response_model=AdminUserStats)
def user_stats(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")
    ws = week_start()
    bonuses = (
        db.query(AdminBonusTask)
        .filter(AdminBonusTask.user_id == user_id, AdminBonusTask.week_start == ws)
        .all()
    )
    return AdminUserStats(
        user=_user_search_result(db, user),
        is_blocked=user.is_blocked,
        bonus_tasks_this_week=[_bonus_task_out(db, b) for b in bonuses],
    )


@router.post("/users/{user_id}/bonus-tasks", response_model=AdminBonusTaskOut, status_code=201)
def create_bonus_task(
    user_id: int,
    body: AdminBonusTaskCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")
    ws = body.week_start or week_start()
    bonus = AdminBonusTask(
        user_id=user_id,
        assigned_by_id=admin.id,
        week_start=ws,
        title=body.title.strip(),
        description=body.description,
        apartment_task_id=None,
    )
    db.add(bonus)
    db.commit()
    db.refresh(bonus)
    notify_event(
        "admin_bonus_task",
        "Вам назначена доп. задача",
        user_ids=[user_id],
        data={
            "bonus_task_id": bonus.id,
            "title": bonus.title,
            "description": bonus.description or "",
            "assigned_by_username": admin.username,
            "assigned_by_display_name": admin.display_name,
        },
    )
    return _bonus_task_out(db, bonus)


@router.delete("/bonus-tasks/{bonus_task_id}", status_code=204)
def delete_bonus_task(
    bonus_task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(AdminBonusTask).filter(AdminBonusTask.id == bonus_task_id).first()
    if not row:
        raise HTTPException(404, detail="Доп. задание не найдено")
    if row.apartment_task_id:
        task = db.query(Task).filter(Task.id == row.apartment_task_id).first()
        if task:
            db.delete(task)
    db.delete(row)
    db.commit()


@router.patch("/users/{user_id}/rating", response_model=AdminUserSearchResult)
def update_user_rating(
    user_id: int,
    body: AdminUserRatingUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")
    if user.is_admin:
        raise HTTPException(400, detail="Рейтинг администратора не редактируется здесь")
    user.total_cleanings = body.total_cleanings
    db.commit()
    db.refresh(user)
    return _user_search_result(db, user)


@router.delete("/violations/{violation_id}", status_code=204)
def delete_violation(
    violation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    violation = (
        db.query(InspectionViolation)
        .filter(InspectionViolation.id == violation_id)
        .first()
    )
    if not violation:
        raise HTTPException(404, detail="Замечание не найдено")
    db.delete(violation)
    db.commit()


@router.get("/users/search", response_model=list[AdminUserSearchResult])
def search_users(
    q: str | None = Query(None, min_length=1),
    building_code: str | None = None,
    apartment_number: int | None = None,
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User).outerjoin(
        ApartmentMember, ApartmentMember.user_id == User.id
    ).outerjoin(Apartment, Apartment.id == ApartmentMember.apartment_id).outerjoin(
        Building, Building.id == Apartment.building_id
    )

    if q:
        pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
                User.display_name.ilike(pattern),
            )
        )
    if building_code:
        query = query.filter(Building.code == building_code.upper())
    if apartment_number is not None:
        query = query.filter(Apartment.number == apartment_number)

    users = query.distinct().limit(limit).all()
    return [_user_search_result(db, u) for u in users]


@router.post("/inspections", response_model=InspectionResponse, status_code=201)
def create_inspection(
    body: InspectionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    apartment = db.query(Apartment).filter(Apartment.id == body.apartment_id).first()
    if not apartment:
        raise HTTPException(404, detail="Квартира не найдена")

    inspection = ApartmentInspection(
        apartment_id=body.apartment_id,
        assigned_by_id=admin.id,
        scheduled_at=body.scheduled_at,
        notes=body.notes,
        status="pending",
    )
    db.add(inspection)
    db.commit()
    db.refresh(inspection)
    return inspection_to_response(db, inspection)


@router.get("/inspections", response_model=list[InspectionResponse])
def list_inspections(
    apartment_id: int | None = None,
    status: str | None = None,
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = (
        db.query(ApartmentInspection)
        .options(joinedload(ApartmentInspection.violations))
        .order_by(ApartmentInspection.created_at.desc())
    )
    if apartment_id is not None:
        query = query.filter(ApartmentInspection.apartment_id == apartment_id)
    if status:
        query = query.filter(ApartmentInspection.status == status)
    inspections = query.limit(limit).all()
    return [inspection_to_response(db, i) for i in inspections]


@router.delete("/inspections/{inspection_id}", status_code=204)
def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    inspection = (
        db.query(ApartmentInspection)
        .filter(ApartmentInspection.id == inspection_id)
        .first()
    )
    if not inspection:
        raise HTTPException(404, detail="Проверка не найдена")
    db.delete(inspection)
    db.commit()


@router.patch("/inspections/{inspection_id}", response_model=InspectionResponse)
def update_inspection(
    inspection_id: int,
    body: InspectionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    inspection = (
        db.query(ApartmentInspection)
        .options(joinedload(ApartmentInspection.violations))
        .filter(ApartmentInspection.id == inspection_id)
        .first()
    )
    if not inspection:
        raise HTTPException(404, detail="Проверка не найдена")

    if body.status is not None:
        inspection.status = body.status
        if body.status == "completed" and not inspection.completed_at:
            inspection.completed_at = datetime.utcnow()
    if body.notes is not None:
        inspection.notes = body.notes
    if body.scheduled_at is not None:
        inspection.scheduled_at = body.scheduled_at

    db.commit()
    db.refresh(inspection)
    return inspection_to_response(db, inspection)


@router.post(
    "/inspections/{inspection_id}/violations",
    response_model=ViolationResponse,
    status_code=201,
)
def add_violation(
    inspection_id: int,
    body: ViolationCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    inspection = (
        db.query(ApartmentInspection)
        .filter(ApartmentInspection.id == inspection_id)
        .first()
    )
    if not inspection:
        raise HTTPException(404, detail="Проверка не найдена")
    if inspection.status == "cancelled":
        raise HTTPException(400, detail="Проверка отменена")

    violation = InspectionViolation(
        inspection_id=inspection_id,
        category=body.category.strip(),
        score=body.score,
        comment=body.comment,
    )
    db.add(violation)
    if inspection.status == "pending":
        inspection.status = "completed"
        inspection.completed_at = datetime.utcnow()
    db.commit()
    db.refresh(violation)
    notify_event(
        "inspection_violation",
        f"Новое нарушение: {violation.category}",
        apartment_id=inspection.apartment_id,
        data={"inspection_id": inspection_id, "violation_id": violation.id},
    )
    return violation


@router.post("/building-roles", status_code=201)
def assign_building_role(
    body: BuildingRoleAssign,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if body.role not in ("dispatcher", "viewer"):
        raise HTTPException(400, detail="role: dispatcher или viewer")
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(404, detail="Пользователь не найден")
    existing = (
        db.query(UserBuildingRole)
        .filter(
            UserBuildingRole.user_id == body.user_id,
            UserBuildingRole.building_code == body.building_code.upper(),
        )
        .first()
    )
    if existing:
        existing.role = body.role
    else:
        db.add(
            UserBuildingRole(
                user_id=body.user_id,
                building_code=body.building_code.upper(),
                role=body.role,
            )
        )
    db.commit()
    return {"ok": True}


@router.get("/building-roles")
def list_building_roles(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    rows = db.query(UserBuildingRole).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "building_code": r.building_code,
            "role": r.role,
        }
        for r in rows
    ]
