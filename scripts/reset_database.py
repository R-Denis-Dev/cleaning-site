"""
Полная очистка БД и создание администратора.

Запуск из корня проекта:
  python scripts/reset_database.py
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from argon2 import PasswordHasher

from app.config import get_settings
from app.database import Base, engine, run_migrations
from app.models.users.models import User
from app.database import SessionLocal
from app.utils.users import sync_admin_flag

ADMINS = [
    ("Admin", "Admin123", "admin@kallisto.example.com", "Администратор Каллисто"),
    ("Admin1", "Admin1234", "admin1@kallisto.example.com", "Администратор Каллисто (Admin1)"),
]


def _db_path() -> Path | None:
    url = get_settings().database_url
    if url.startswith("sqlite:///"):
        rel = url.removeprefix("sqlite:///")
        return (ROOT / rel).resolve()
    return None


def main() -> None:
    db_file = _db_path()
    import app.main  # noqa: F401

    try:
        Base.metadata.drop_all(bind=engine)
        print("Все таблицы удалены.")
    except Exception as exc:
        if db_file and db_file.exists():
            try:
                db_file.unlink()
                print(f"Удалён файл БД: {db_file}")
            except OSError as err:
                raise SystemExit(
                    "Не удалось очистить БД: остановите сервер FastAPI и запустите скрипт снова."
                ) from err
        else:
            raise exc

    uploads = ROOT / get_settings().uploads_dir
    if uploads.exists():
        shutil.rmtree(uploads)
        print(f"Очищена папка загрузок: {uploads}")
    uploads.mkdir(parents=True, exist_ok=True)

    Base.metadata.create_all(bind=engine)
    run_migrations()
    print("Таблицы созданы заново.")

    hasher = PasswordHasher()
    db = SessionLocal()
    try:
        for username, password, email, display_name in ADMINS:
            admin = User(
                username=username,
                email=email,
                hashed_password=hasher.hash(password),
                is_admin=True,
                admin_frame_color="white",
                display_name=display_name,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            sync_admin_flag(admin, db)
            print(f"Создан администратор: {username} / {email}")
    finally:
        db.close()

    print("Готово. Укажите в .env: ADMIN_USERNAMES=Admin,Admin1")


if __name__ == "__main__":
    main()
