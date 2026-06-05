"""Действия администратора над пользователями и квартирами."""

from sqlalchemy.orm import Session

from app.models.housing.models import ApartmentMember
from app.models.users.models import User
from app.services.housing_members import release_user_schedules


def admin_remove_from_apartment(db: Session, user_id: int, apartment_id: int) -> None:
    member = (
        db.query(ApartmentMember)
        .filter(
            ApartmentMember.user_id == user_id,
            ApartmentMember.apartment_id == apartment_id,
        )
        .first()
    )
    if not member:
        return
    release_user_schedules(db, user_id, apartment_id)
    db.delete(member)
    db.commit()


def admin_set_manager(db: Session, apartment_id: int, user_id: int) -> None:
    members = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.apartment_id == apartment_id)
        .all()
    )
    target = next((m for m in members if m.user_id == user_id), None)
    if not target:
        raise ValueError("Жилец не в этой квартире")
    for m in members:
        m.role = "manager" if m.user_id == user_id else "resident"
    db.commit()


def admin_block_user(db: Session, user: User) -> None:
    member = (
        db.query(ApartmentMember).filter(ApartmentMember.user_id == user.id).first()
    )
    if member:
        release_user_schedules(db, user.id, member.apartment_id)
        db.delete(member)
    user.is_blocked = True
    user.display_name = None
    user.bio = None
    user.avatar_url = None
    user.equipped_frame_code = None
    db.add(user)
    db.commit()


def admin_unblock_user(db: Session, user: User) -> None:
    user.is_blocked = False
    db.add(user)
    db.commit()
