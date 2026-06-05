"""
Создание администратора (или обновление пароля / флага is_admin).

Запуск из корня проекта:
  python scripts/add_admin.py
  python scripts/add_admin.py --username Admin1 --password Admin1234
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

DEFAULTS = {
    "username": "Admin1",
    "password": "Admin1234",
    "email": "admin1@kallisto.example.com",
    "display_name": "Администратор Каллисто (Admin1)",
}


def _append_admin_username(username: str) -> None:
    key = "ADMIN_USERNAMES"
    names = {u.strip().lower() for u in os.getenv(key, "").split(",") if u.strip()}
    names.add(username.lower())
    # Сохраняем исходный регистр для известных логинов, новый — как передан
    ordered: list[str] = []
    for part in os.getenv(key, "").split(","):
        p = part.strip()
        if p and p.lower() not in {x.lower() for x in ordered}:
            ordered.append(p)
    if username not in ordered and username.lower() not in {x.lower() for x in ordered}:
        ordered.append(username)
    os.environ[key] = ",".join(ordered) if ordered else username


def main() -> None:
    parser = argparse.ArgumentParser(description="Добавить администратора")
    parser.add_argument("--username", default=DEFAULTS["username"])
    parser.add_argument("--password", default=DEFAULTS["password"])
    parser.add_argument("--email", default=DEFAULTS["email"])
    parser.add_argument("--display-name", default=DEFAULTS["display_name"])
    args = parser.parse_args()

    _append_admin_username(args.username)

    from app.config import get_settings

    get_settings.cache_clear()

    import app.main  # noqa: F401

    from argon2 import PasswordHasher

    from app.database import SessionLocal, run_migrations
    from app.models.users.models import User
    from app.utils.users import sync_admin_flag

    run_migrations()
    hasher = PasswordHasher()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == args.username).first()
        if user:
            user.hashed_password = hasher.hash(args.password)
            user.is_blocked = False
            if args.display_name:
                user.display_name = args.display_name
            if not user.admin_frame_color:
                user.admin_frame_color = "white"
            db.commit()
            db.refresh(user)
            sync_admin_flag(user, db)
            print(f"Обновлён администратор: {args.username}")
        else:
            user = User(
                username=args.username,
                email=args.email,
                hashed_password=hasher.hash(args.password),
                is_admin=True,
                admin_frame_color="white",
                display_name=args.display_name,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            sync_admin_flag(user, db)
            print(f"Создан администратор: {args.username} / {args.email}")
        assert user.is_admin, "is_admin не установлен — проверьте ADMIN_USERNAMES"
        print(f"Пароль: {args.password}")
        print(f"ADMIN_USERNAMES={os.environ.get('ADMIN_USERNAMES', '')}")
        print("Скопируйте ADMIN_USERNAMES в файл .env и перезапустите сервер.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
