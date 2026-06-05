"""Исправить email администратора (домен .local не проходит EmailStr)."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.database import engine

NEW_EMAIL = "adminkallisto@kallisto.example.com"

with engine.connect() as conn:
    result = conn.execute(
        text("UPDATE users SET email = :email WHERE username = 'AdminKallisto'"),
        {"email": NEW_EMAIL},
    )
    conn.commit()
    print(f"Обновлено записей: {result.rowcount}, email: {NEW_EMAIL}")
