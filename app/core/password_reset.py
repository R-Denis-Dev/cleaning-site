import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.extras.models import PasswordResetToken
from app.models.users.models import User

settings = get_settings()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def create_reset_code(db: Session, user: User) -> str:
    """6-значный код; хранится только хэш."""
    code = _generate_code()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id
    ).delete()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(code),
            expires_at=datetime.utcnow()
            + timedelta(minutes=settings.reset_code_expire_minutes),
        )
    )
    db.commit()
    return code


def create_reset_token(db: Session, user: User, hours: int = 24) -> str:
    """Совместимость: длинный токен (legacy)."""
    raw = secrets.token_urlsafe(32)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id
    ).delete()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(raw),
            expires_at=datetime.utcnow() + timedelta(hours=hours),
        )
    )
    db.commit()
    return raw


def consume_reset_token(db: Session, raw: str) -> User | None:
    """Принимает 6-значный код или legacy-токен."""
    normalized = raw.strip().replace(" ", "")
    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == _hash_token(normalized))
        .first()
    )
    if not row or row.expires_at < datetime.utcnow():
        return None
    user = db.query(User).filter(User.id == row.user_id).first()
    if user:
        db.delete(row)
        db.commit()
    return user
