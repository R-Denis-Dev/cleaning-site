from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.models.housing.models import Apartment, ApartmentMember
from app.models.users.models import User
from app.models.users.schemas import UserApartmentInfo


def sync_admin_flag(user: User, db: Session) -> None:
    """Выдаёт права админа по ADMIN_USERNAMES. Снятие прав только вручную (is_admin в БД)."""
    settings = get_settings()
    if not settings.admin_username_set:
        return
    should_be_admin = user.username.lower() in settings.admin_username_set
    if should_be_admin and not user.is_admin:
        user.is_admin = True
        db.add(user)
        db.commit()
        db.refresh(user)


def user_apartment_info(db: Session, user_id: int) -> UserApartmentInfo | None:
    member = (
        db.query(ApartmentMember)
        .filter(ApartmentMember.user_id == user_id)
        .first()
    )
    if not member:
        return None
    apartment = (
        db.query(Apartment)
        .options(joinedload(Apartment.building))
        .filter(Apartment.id == member.apartment_id)
        .first()
    )
    if not apartment or not apartment.building:
        return None
    return UserApartmentInfo(
        building_code=apartment.building.code,
        apartment_number=apartment.number,
        role=member.role,
        apartment_total_cleanings=apartment.total_cleanings,
        apartment_equipped_frame_code=apartment.equipped_frame_code,
        apartment_avatar_url=apartment.avatar_url,
    )
