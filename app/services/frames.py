"""Каталог рамок и правила разблокировки."""

from dataclasses import dataclass
from typing import Literal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.housing.models import Apartment
from app.models.users.models import User

FrameTarget = Literal["user", "apartment"]
UnlockKind = Literal["rank", "cleanings"]


@dataclass(frozen=True)
class FrameDefinition:
    code: str
    name: str
    description: str
    target: FrameTarget
    kind: UnlockKind
    threshold: int
    ring_class: str


USER_FRAMES: tuple[FrameDefinition, ...] = (
    FrameDefinition(
        code="user_rank_1",
        name="Чемпион",
        description="1-е место в рейтинге жильцов",
        target="user",
        kind="rank",
        threshold=1,
        ring_class="avatar-ring-gold",
    ),
    FrameDefinition(
        code="user_rank_2",
        name="Серебро",
        description="2-е место в рейтинге жильцов",
        target="user",
        kind="rank",
        threshold=2,
        ring_class="avatar-ring-silver",
    ),
    FrameDefinition(
        code="user_rank_3",
        name="Бронза",
        description="3-е место в рейтинге жильцов",
        target="user",
        kind="rank",
        threshold=3,
        ring_class="avatar-ring-bronze",
    ),
    FrameDefinition(
        code="user_cleanings_10",
        name="Стажёр",
        description="10 выполненных уборок",
        target="user",
        kind="cleanings",
        threshold=10,
        ring_class="avatar-ring-teal",
    ),
    FrameDefinition(
        code="user_cleanings_50",
        name="Мастер",
        description="50 выполненных уборок",
        target="user",
        kind="cleanings",
        threshold=50,
        ring_class="avatar-ring-violet",
    ),
    FrameDefinition(
        code="user_cleanings_100",
        name="Легенда",
        description="100 выполненных уборок",
        target="user",
        kind="cleanings",
        threshold=100,
        ring_class="avatar-ring-legend",
    ),
)

APARTMENT_FRAMES: tuple[FrameDefinition, ...] = (
    FrameDefinition(
        code="apt_rank_1",
        name="Лучшая квартира",
        description="1-е место среди квартир",
        target="apartment",
        kind="rank",
        threshold=1,
        ring_class="avatar-ring-gold",
    ),
    FrameDefinition(
        code="apt_rank_2",
        name="Серебряная квартира",
        description="2-е место среди квартир",
        target="apartment",
        kind="rank",
        threshold=2,
        ring_class="avatar-ring-silver",
    ),
    FrameDefinition(
        code="apt_rank_3",
        name="Бронзовая квартира",
        description="3-е место среди квартир",
        target="apartment",
        kind="rank",
        threshold=3,
        ring_class="avatar-ring-bronze",
    ),
    FrameDefinition(
        code="apt_cleanings_25",
        name="Слаженность",
        description="25 уборок в квартире",
        target="apartment",
        kind="cleanings",
        threshold=25,
        ring_class="avatar-ring-teal",
    ),
    FrameDefinition(
        code="apt_cleanings_100",
        name="Идеал",
        description="100 уборок в квартире",
        target="apartment",
        kind="cleanings",
        threshold=100,
        ring_class="avatar-ring-legend",
    ),
)

ALL_FRAMES = {f.code: f for f in (*USER_FRAMES, *APARTMENT_FRAMES)}


def get_user_rank(db: Session, user_id: int) -> int | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.is_admin or user.total_cleanings <= 0:
        return None
    higher = (
        db.query(func.count(User.id))
        .filter(
            User.total_cleanings > user.total_cleanings,
            User.is_admin.is_(False),
        )
        .scalar()
    )
    return int(higher) + 1


def get_apartment_rank(db: Session, apartment_id: int) -> int | None:
    apt = db.query(Apartment).filter(Apartment.id == apartment_id).first()
    if not apt or apt.total_cleanings <= 0:
        return None
    higher = (
        db.query(func.count(Apartment.id))
        .filter(Apartment.total_cleanings > apt.total_cleanings)
        .scalar()
    )
    return int(higher) + 1


def _frame_unlocked(frame: FrameDefinition, rank: int | None, cleanings: int) -> bool:
    if frame.kind == "cleanings":
        return cleanings >= frame.threshold
    if rank is None:
        return False
    return rank == frame.threshold


def unlocked_user_frame_codes(db: Session, user: User) -> list[str]:
    rank = get_user_rank(db, user.id)
    return [
        f.code
        for f in USER_FRAMES
        if _frame_unlocked(f, rank, user.total_cleanings)
    ]


def unlocked_apartment_frame_codes(db: Session, apartment: Apartment) -> list[str]:
    rank = get_apartment_rank(db, apartment.id)
    return [
        f.code
        for f in APARTMENT_FRAMES
        if _frame_unlocked(f, rank, apartment.total_cleanings)
    ]


def is_user_frame_unlocked(db: Session, user: User, frame_code: str) -> bool:
    return frame_code in unlocked_user_frame_codes(db, user)


def is_apartment_frame_unlocked(db: Session, apartment: Apartment, frame_code: str) -> bool:
    return frame_code in unlocked_apartment_frame_codes(db, apartment)


def sanitize_user_equipped_frame(db: Session, user: User) -> None:
    if not user.equipped_frame_code:
        return
    if not is_user_frame_unlocked(db, user, user.equipped_frame_code):
        user.equipped_frame_code = None
        db.add(user)
        db.commit()


def sanitize_apartment_equipped_frame(db: Session, apartment: Apartment) -> None:
    if not apartment.equipped_frame_code:
        return
    if not is_apartment_frame_unlocked(db, apartment, apartment.equipped_frame_code):
        apartment.equipped_frame_code = None
        db.add(apartment)
        db.commit()


def frame_to_dict(frame: FrameDefinition, unlocked: bool) -> dict:
    return {
        "code": frame.code,
        "name": frame.name,
        "description": frame.description,
        "target": frame.target,
        "kind": frame.kind,
        "threshold": frame.threshold,
        "ring_class": frame.ring_class,
        "unlocked": unlocked,
    }


def catalog_for_user(db: Session, user: User) -> list[dict]:
    unlocked = set(unlocked_user_frame_codes(db, user))
    return [frame_to_dict(f, f.code in unlocked) for f in USER_FRAMES]


def catalog_for_apartment(db: Session, apartment: Apartment) -> list[dict]:
    unlocked = set(unlocked_apartment_frame_codes(db, apartment))
    return [frame_to_dict(f, f.code in unlocked) for f in APARTMENT_FRAMES]
