from sqlalchemy.orm import Session

from app.models.housing.models import Apartment
from app.models.tasks.models import Task, TaskTemplate

DEFAULT_TASK_SETS = {
    "light": [
        "Протереть пыль",
        "Собрать вещи",
        "Проветрить комнаты",
    ],
    "general": [
        "Убрать пол (помыть, подмести)",
        "Выкинуть мусор",
        "Помыть посуду",
        "Прибраться в комнате",
        "Почистить туалет и ванную комнату",
        "Прибраться на кухне",
    ],
}


def _expected_default_names(apartment: Apartment, db: Session) -> list[str]:
    if not apartment.use_default_tasks:
        templates = (
            db.query(TaskTemplate)
            .filter(TaskTemplate.apartment_id == apartment.id)
            .all()
        )
        return [t.name for t in templates]

    mode = getattr(apartment, "cleaning_mode", None) or "general"
    if mode not in DEFAULT_TASK_SETS:
        mode = "general"
    return DEFAULT_TASK_SETS[mode]


def sync_default_tasks_for_day(
    db: Session,
    apartment: Apartment,
    day_of_week: int,
) -> None:
    """Добавляет недостающие стандартные задачи, сохраняя кастомные и прогресс."""
    expected_names = _expected_default_names(apartment, db)
    existing = (
        db.query(Task)
        .filter(
            Task.apartment_id == apartment.id,
            Task.day_of_week == day_of_week,
        )
        .all()
    )

    default_by_name = {
        t.name: t for t in existing if t.created_by_id is None
    }
    expected_set = set(expected_names)

    for name in expected_names:
        if name not in default_by_name:
            db.add(
                Task(
                    apartment_id=apartment.id,
                    day_of_week=day_of_week,
                    name=name,
                )
            )

    for task in existing:
        if task.created_by_id is not None:
            continue
        if task.name not in expected_set:
            db.delete(task)

    db.commit()


def sync_default_tasks_for_apartment(db: Session, apartment_id: int) -> None:
    apartment = db.query(Apartment).filter(Apartment.id == apartment_id).first()
    if not apartment:
        return
    for day in range(7):
        sync_default_tasks_for_day(db, apartment, day)


def seed_tasks_for_day(db: Session, apartment_id: int, day_of_week: int) -> None:
    apartment = db.query(Apartment).filter(Apartment.id == apartment_id).first()
    if not apartment:
        return
    sync_default_tasks_for_day(db, apartment, day_of_week)


def clear_tasks_for_apartment(db: Session, apartment_id: int) -> None:
    """Полный сброс — только по явному запросу менеджера."""
    db.query(Task).filter(Task.apartment_id == apartment_id).delete()
    db.commit()
