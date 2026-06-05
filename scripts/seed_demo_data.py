"""
Демо-наполнение корпусов C1, C2, R1–R5 жильцами с разными профилями.

Запуск из корня проекта:
  python scripts/seed_demo_data.py          # добавить (пропуск существующих логинов)
  python scripts/seed_demo_data.py --fresh  # удалить всех не-админов и создать заново

Пароль у всех демо-жильцов: Resident123
"""
from __future__ import annotations

import argparse
import random
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app.main  # noqa: F401 — регистрация моделей

from argon2 import PasswordHasher

from app.database import SessionLocal, run_migrations
from app.models.admin.models import AdminBonusTask
from app.models.cleaning.models import WeeklyCleaningCompletion
from app.models.extras.models import (
    DaySwapRequest,
    PasswordResetToken,
    TaskComment,
    UserBuildingRole,
)
from app.models.housing.models import Apartment, ApartmentMember, Building
from app.models.schedule.models import Schedule
from app.models.users.models import User
from app.routers.housing.housing_router import seed_buildings_and_apartments
from app.routers.schedule.schedule_router import seed_week_if_empty
from app.services.tasks import sync_default_tasks_for_apartment
from app.utils.week import week_start

TARGET_BUILDINGS = ["C1", "C2", "R1", "R2", "R3", "R4", "R5"]
DEMO_PASSWORD = "Resident123"

# Номера квартир в каждом корпусе (охват 1–96)
APARTMENT_NUMBERS = [
    3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63, 67, 71, 75, 79, 83, 87, 91, 95,
]

SURNAMES = [
    "Иванов", "Петров", "Сидоров", "Козлов", "Новиков", "Морозов", "Волков", "Соколов",
    "Лебедев", "Кузнецов", "Попов", "Васильев", "Смирнов", "Михайлов", "Фёдоров", "Андреев",
    "Алексеев", "Романов", "Орлов", "Соловьёв", "Зайцев", "Павлов", "Семёнов", "Голубев",
    "Виноградов", "Богданов", "Воробьёв", "Фролов", "Макаров", "Николаев", "Киселёв", "Марков",
    "Белова", "Комарова", "Орлова", "Соколова", "Павлова", "Медведева", "Егорова", "Кузнецова",
]

FIRST_NAMES_M = [
    "Иван", "Алексей", "Дмитрий", "Сергей", "Андрей", "Михаил", "Николай", "Павел",
    "Егор", "Максим", "Артём", "Кирилл", "Роман", "Владимир", "Олег", "Илья",
]

FIRST_NAMES_F = [
    "Анна", "Мария", "Елена", "Ольга", "Наталья", "Татьяна", "Ирина", "Светлана",
    "Екатерина", "Юлия", "Дарья", "Алина", "Виктория", "Полина", "Ксения", "Вероника",
]

PATRONYMICS_M = [
    "Иванович", "Петрович", "Сергеевич", "Алексеевич", "Дмитриевич", "Андреевич",
    "Николаевич", "Михайлович", "Владимирович", "Олегович",
]

PATRONYMICS_F = [
    "Ивановна", "Петровна", "Сергеевна", "Алексеевна", "Дмитриевна", "Андреевна",
    "Николаевна", "Михайловна", "Владимировна", "Олеговна",
]

BIOS = [
    "Живу в общежитии второй год, люблю порядок.",
    "Студент 3 курса, в свободное время играю в настолки.",
    "Ответственный за уборку по субботам.",
    "Люблю готовить, соседи не жалуются.",
    "Спортсмен, рано встаю.",
    "Тихий сосед, музыку слушаю в наушниках.",
    None,
    "Участвую в студсовете корпуса.",
    "Фанат чистоты на кухне.",
]

TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh",
    "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu",
    "я": "ya",
}

AVATAR_STYLES = [
    "avataaars", "personas", "lorelei", "micah", "adventurer", "big-smile", "notionists",
]


def translit(text: str) -> str:
    out = []
    for ch in text.lower():
        out.append(TRANSLIT.get(ch, ch if ch.isascii() and ch.isalnum() else ""))
    return "".join(out)


def avatar_url(seed: str, style: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]", "_", seed)[:64]
    return f"https://api.dicebear.com/7.x/{style}/svg?seed={safe}"


def clear_residents(db) -> int:
    ids = [u.id for u in db.query(User).filter(User.is_admin.is_(False)).all()]
    if not ids:
        return 0

    db.query(AdminBonusTask).filter(
        (AdminBonusTask.user_id.in_(ids)) | (AdminBonusTask.assigned_by_id.in_(ids))
    ).delete(synchronize_session=False)
    db.query(WeeklyCleaningCompletion).filter(
        WeeklyCleaningCompletion.user_id.in_(ids)
    ).delete(synchronize_session=False)
    db.query(DaySwapRequest).filter(
        (DaySwapRequest.requester_id.in_(ids)) | (DaySwapRequest.target_user_id.in_(ids))
    ).delete(synchronize_session=False)
    db.query(TaskComment).filter(TaskComment.user_id.in_(ids)).delete(synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id.in_(ids)).delete(
        synchronize_session=False
    )
    db.query(UserBuildingRole).filter(UserBuildingRole.user_id.in_(ids)).delete(
        synchronize_session=False
    )
    db.query(Schedule).filter(Schedule.user_id.in_(ids)).update(
        {Schedule.user_id: None, Schedule.is_taken: False}, synchronize_session=False
    )
    db.query(ApartmentMember).filter(ApartmentMember.user_id.in_(ids)).delete(
        synchronize_session=False
    )
    db.query(User).filter(User.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return len(ids)


def unique_username(db, base: str) -> str:
    candidate = base[:48]
    n = 0
    while True:
        name = candidate if n == 0 else f"{candidate[:40]}_{n}"
        if not db.query(User).filter(User.username == name).first():
            return name
        n += 1


def make_person(rng: random.Random, used_emails: set[str]) -> tuple[str, str, str, str, str | None]:
    female = rng.random() < 0.45
    surname = rng.choice(SURNAMES)
    if female and not surname.endswith(("ова", "ева", "ина", "ая")):
        if surname.endswith("ов"):
            surname = surname[:-2] + "ова"
        elif surname.endswith("ев"):
            surname = surname[:-2] + "ева"
        elif surname.endswith("ин"):
            surname = surname + "а"
    first = rng.choice(FIRST_NAMES_F if female else FIRST_NAMES_M)
    patronymic = rng.choice(PATRONYMICS_F if female else PATRONYMICS_M)
    display = f"{surname} {first} {patronymic}"
    base_login = translit(f"{surname}.{first[0]}{patronymic[0]}").replace(".", ".")
    base_login = re.sub(r"[^a-z0-9.]+", "", base_login) or "resident"
    email_base = base_login.replace(".", ".")
    email = f"{email_base}@resident.kallisto.example.com"
    n = 0
    while email in used_emails:
        n += 1
        email = f"{email_base}{n}@resident.kallisto.example.com"
    used_emails.add(email)
    bio = rng.choice(BIOS)
    style = rng.choice(AVATAR_STYLES)
    av = avatar_url(f"{display}-{rng.randint(1, 99999)}", style)
    return display, base_login, email, av, bio


def add_cleaning_history(
    db,
    user_id: int,
    apartment_id: int,
    count: int,
    rng: random.Random,
    ws: date,
) -> None:
    if count <= 0:
        return
    added = 0
    week_offset = 0
    now = datetime.now()
    while added < count and week_offset < 80:
        wk = ws - timedelta(weeks=week_offset)
        days = list(range(7))
        rng.shuffle(days)
        for day in days:
            if added >= count:
                break
            exists = (
                db.query(WeeklyCleaningCompletion)
                .filter(
                    WeeklyCleaningCompletion.user_id == user_id,
                    WeeklyCleaningCompletion.week_start == wk,
                    WeeklyCleaningCompletion.day_of_week == day,
                )
                .first()
            )
            if exists:
                continue
            completed = now - timedelta(weeks=week_offset, days=rng.randint(0, 6))
            db.add(
                WeeklyCleaningCompletion(
                    user_id=user_id,
                    apartment_id=apartment_id,
                    week_start=wk,
                    day_of_week=day,
                    completed_at=completed,
                )
            )
            added += 1
        week_offset += 1


def residents_for_apartment(rng: random.Random, apt_index: int) -> int:
    roll = (apt_index + rng.randint(0, 3)) % 5
    if roll == 0:
        return 4
    if roll == 1:
        return 3
    if roll == 2:
        return 2
    return 1


def seed_demo(*, fresh: bool) -> None:
    run_migrations()
    db = SessionLocal()
    hasher = PasswordHasher()
    rng = random.Random(42)
    ws = week_start()

    try:
        seed_buildings_and_apartments(db)
        if fresh:
            removed = clear_residents(db)
            print(f"Удалено жильцов: {removed}")

        existing_logins = {u.username for u in db.query(User.username).all()}
        used_emails: set[str] = {u.email for u in db.query(User.email).all()}

        created_users = 0
        created_members = 0

        for b_idx, code in enumerate(TARGET_BUILDINGS):
            building = db.query(Building).filter(Building.code == code).first()
            if not building:
                print(f"Корпус {code} не найден, пропуск.")
                continue

            for a_idx, apt_num in enumerate(APARTMENT_NUMBERS):
                apartment = (
                    db.query(Apartment)
                    .filter(
                        Apartment.building_id == building.id,
                        Apartment.number == apt_num,
                    )
                    .first()
                )
                if not apartment:
                    continue

                n_residents = residents_for_apartment(rng, a_idx + b_idx)
                current = (
                    db.query(ApartmentMember)
                    .filter(ApartmentMember.apartment_id == apartment.id)
                    .count()
                )
                slots = max(0, apartment.max_residents - current)
                to_add = min(n_residents, slots)
                if to_add == 0:
                    continue

                if a_idx % 4 == 0:
                    apartment.cleaning_mode = "light"
                elif a_idx % 4 == 2:
                    apartment.cleaning_mode = "general"
                apartment.total_cleanings = rng.randint(2, 45)
                if rng.random() < 0.25:
                    apartment.avatar_url = avatar_url(f"apt-{code}-{apt_num}", "shapes")

                seed_week_if_empty(db, apartment.id, ws)
                sync_default_tasks_for_apartment(db, apartment.id)

                for r in range(to_add):
                    display, login_base, email, av, bio = make_person(rng, used_emails)
                    username = unique_username(db, login_base)
                    if username in existing_logins:
                        continue

                    cleanings = rng.choice([0, 1, 2, 3, 5, 7, 9, 12, 15, 18, 22, 26, 30])
                    if b_idx % 2 == 0 and r == 0:
                        cleanings = rng.randint(20, 35)
                    elif r == 0:
                        cleanings = rng.randint(8, 20)

                    user = User(
                        username=username,
                        email=email,
                        hashed_password=hasher.hash(DEMO_PASSWORD),
                        display_name=display,
                        avatar_url=av,
                        bio=bio,
                        total_cleanings=cleanings,
                        is_admin=False,
                    )
                    db.add(user)
                    db.flush()

                    role = "manager" if current + r == 0 else "resident"
                    db.add(
                        ApartmentMember(
                            user_id=user.id,
                            apartment_id=apartment.id,
                            role=role,
                        )
                    )

                    add_cleaning_history(db, user.id, apartment.id, cleanings, rng, ws)

                    if r == 0 and rng.random() < 0.6:
                        schedules = (
                            db.query(Schedule)
                            .filter(
                                Schedule.apartment_id == apartment.id,
                                Schedule.week_start == ws,
                            )
                            .all()
                        )
                        day = rng.choice(schedules) if schedules else None
                        if day and not day.is_taken:
                            day.user_id = user.id
                            day.is_taken = True

                    existing_logins.add(username)
                    created_users += 1
                    created_members += 1

        db.commit()
        print(f"Создано пользователей: {created_users}")
        print(f"Заселено записей ApartmentMember: {created_members}")
        print(f"Корпуса: {', '.join(TARGET_BUILDINGS)}")
        print(f"Пароль демо-жильцов: {DEMO_PASSWORD}")
        print("Администратор не изменён (Admin / Admin123).")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Демо-данные для корпусов C1–R5")
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Удалить всех не-администраторов перед заполнением",
    )
    args = parser.parse_args()
    seed_demo(fresh=args.fresh)


if __name__ == "__main__":
    main()
