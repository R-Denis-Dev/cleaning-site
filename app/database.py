from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import get_settings

settings = get_settings()

_engine_kwargs: dict = {}
if settings.database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs.update(
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
        pool_recycle=1800,
    )

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def _is_sqlite() -> bool:
    return settings.database_url.startswith("sqlite")


def _sqlite_column_names(conn, table: str) -> set[str]:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return {row[1] for row in rows}


def _pg_column_names(conn, table: str) -> set[str]:
    rows = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :table"
        ),
        {"table": table},
    ).fetchall()
    return {row[0] for row in rows}


def _column_names(conn, table: str) -> set[str]:
    if _is_sqlite():
        return _sqlite_column_names(conn, table)
    return _pg_column_names(conn, table)


def _add_column(conn, table: str, column: str, ddl: str) -> None:
    cols = _column_names(conn, table)
    if column not in cols:
        conn.execute(text(ddl))


def run_migrations() -> None:
    """Инкрементальные миграции без Alembic (SQLite и PostgreSQL)."""
    with engine.connect() as conn:
        apt_cols = _column_names(conn, "apartments")
        if "cleaning_mode" not in apt_cols:
            default = "DEFAULT 'general' NOT NULL" if _is_sqlite() else "NOT NULL DEFAULT 'general'"
            _add_column(
                conn,
                "apartments",
                "cleaning_mode",
                f"ALTER TABLE apartments ADD COLUMN cleaning_mode VARCHAR {default}",
            )
        if "max_residents" in apt_cols and _is_sqlite():
            conn.execute(
                text("UPDATE apartments SET max_residents = 8 WHERE max_residents < 8")
            )
        _add_column(conn, "apartments", "description", "ALTER TABLE apartments ADD COLUMN description TEXT")
        _add_column(
            conn,
            "apartments",
            "description_updated_at",
            "ALTER TABLE apartments ADD COLUMN description_updated_at TIMESTAMP",
        )
        _add_column(
            conn,
            "apartments",
            "description_updated_by_id",
            "ALTER TABLE apartments ADD COLUMN description_updated_by_id INTEGER",
        )
        _add_column(
            conn,
            "apartments",
            "total_cleanings",
            "ALTER TABLE apartments ADD COLUMN total_cleanings INTEGER NOT NULL DEFAULT 0",
        )
        _add_column(
            conn,
            "apartments",
            "equipped_frame_code",
            "ALTER TABLE apartments ADD COLUMN equipped_frame_code VARCHAR(64)",
        )
        _add_column(
            conn,
            "apartments",
            "avatar_url",
            "ALTER TABLE apartments ADD COLUMN avatar_url VARCHAR",
        )

        user_cols = _column_names(conn, "users")
        _add_column(conn, "users", "display_name", "ALTER TABLE users ADD COLUMN display_name VARCHAR")
        _add_column(conn, "users", "avatar_url", "ALTER TABLE users ADD COLUMN avatar_url VARCHAR")
        _add_column(conn, "users", "bio", "ALTER TABLE users ADD COLUMN bio TEXT")
        if "is_admin" not in user_cols:
            if _is_sqlite():
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN is_admin BOOLEAN "
                        "DEFAULT 0 NOT NULL"
                    )
                )
            else:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN is_admin BOOLEAN "
                        "NOT NULL DEFAULT FALSE"
                    )
                )
        _add_column(
            conn,
            "users",
            "equipped_frame_code",
            "ALTER TABLE users ADD COLUMN equipped_frame_code VARCHAR(64)",
        )
        _add_column(
            conn,
            "users",
            "admin_frame_color",
            "ALTER TABLE users ADD COLUMN admin_frame_color VARCHAR(16)",
        )
        _add_column(
            conn,
            "users",
            "admin_frame_style",
            "ALTER TABLE users ADD COLUMN admin_frame_style VARCHAR(24)",
        )
        if inspect(engine).has_table("admin_bonus_tasks"):
            if "is_completed" not in _column_names(conn, "admin_bonus_tasks"):
                if _is_sqlite():
                    conn.execute(
                        text(
                            "ALTER TABLE admin_bonus_tasks ADD COLUMN is_completed "
                            "BOOLEAN DEFAULT 0 NOT NULL"
                        )
                    )
                else:
                    conn.execute(
                        text(
                            "ALTER TABLE admin_bonus_tasks ADD COLUMN is_completed "
                            "BOOLEAN NOT NULL DEFAULT FALSE"
                        )
                    )
            _add_column(
                conn,
                "admin_bonus_tasks",
                "completed_at",
                "ALTER TABLE admin_bonus_tasks ADD COLUMN completed_at TIMESTAMP",
            )
        if inspect(engine).has_table("admin_bonus_tasks"):
            _add_column(
                conn,
                "admin_bonus_tasks",
                "apartment_task_id",
                "ALTER TABLE admin_bonus_tasks ADD COLUMN apartment_task_id INTEGER",
            )

        if inspect(engine).has_table("campus_announcements"):
            _add_column(
                conn,
                "campus_announcements",
                "image_url",
                "ALTER TABLE campus_announcements ADD COLUMN image_url VARCHAR",
            )
        if "is_blocked" not in user_cols:
            if _is_sqlite():
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN is_blocked BOOLEAN "
                        "DEFAULT 0 NOT NULL"
                    )
                )
            else:
                conn.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN is_blocked BOOLEAN "
                        "NOT NULL DEFAULT FALSE"
                    )
                )

        task_cols = _column_names(conn, "tasks")
        if "created_by_id" not in task_cols:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN created_by_id INTEGER"))

        if inspect(engine).has_table("weekly_cleaning_completions"):
            _add_column(
                conn,
                "weekly_cleaning_completions",
                "photo_url",
                "ALTER TABLE weekly_cleaning_completions ADD COLUMN photo_url VARCHAR",
            )

        conn.commit()

    _ensure_indexes()


def _ensure_indexes() -> None:
    """Создаёт индексы для рейтингов, если их ещё нет."""
    insp = inspect(engine)
    with engine.connect() as conn:
        if insp.has_table("users"):
            existing = {idx["name"] for idx in insp.get_indexes("users")}
            if "ix_users_total_cleanings" not in existing:
                try:
                    conn.execute(
                        text(
                            "CREATE INDEX ix_users_total_cleanings "
                            "ON users (total_cleanings)"
                        )
                    )
                    conn.commit()
                except Exception:
                    conn.rollback()
        if insp.has_table("apartments"):
            existing = {idx["name"] for idx in insp.get_indexes("apartments")}
            if "ix_apartments_total_cleanings" not in existing:
                try:
                    conn.execute(
                        text(
                            "CREATE INDEX ix_apartments_total_cleanings "
                            "ON apartments (total_cleanings)"
                        )
                    )
                    conn.commit()
                except Exception:
                    conn.rollback()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
