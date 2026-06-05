from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.dependencies import (
    get_current_apartment_member,
    get_current_user,
    require_manager,
)
from app.models.cleaning.models import WeeklyCleaningCompletion
from app.models.housing.models import Apartment
from app.models.schedule.models import Schedule
from app.models.tasks.models import Task, TaskTemplate
from app.models.tasks.schemas import (
    TaskCreate,
    TaskListResponse,
    TaskResponse,
    TaskTemplateCreate,
    TaskTemplateResponse,
)
from app.models.users.models import User
from app.services.tasks import (
    DEFAULT_TASK_SETS,
    clear_tasks_for_apartment,
    sync_default_tasks_for_apartment,
)
from app.utils.cleaning_weekly import (
    revoke_cleaning_completion,
    weekly_cleanings_count,
    weekly_cleanings_remaining,
)
from app.utils.task_permissions import can_toggle_tasks_for_user, user_owns_cleaning_day
from app.services.notify import notify_event
from app.utils.week import week_start

router = APIRouter(prefix="/tasks", tags=["tasks"])
settings = get_settings()


def _task_to_response(task: Task, current_user_id: int) -> TaskResponse:
    is_custom = task.created_by_id is not None
    return TaskResponse(
        id=task.id,
        apartment_id=task.apartment_id,
        day_of_week=task.day_of_week,
        name=task.name,
        is_done=task.is_done,
        created_by_id=task.created_by_id,
        is_custom=is_custom,
        can_delete=is_custom and task.created_by_id == current_user_id,
    )


def _validate_day(day_of_week: int) -> None:
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(400, detail="day_of_week должен быть от 0 до 6")


def seed_tasks_for_day(db: Session, apartment_id: int, day_of_week: int) -> None:
    from app.services.tasks import seed_tasks_for_day as _seed

    _seed(db, apartment_id, day_of_week)


@router.get("/sets/available")
def available_task_sets(_: User = Depends(get_current_user)):
    return {
        "modes": [
            {
                "id": "light",
                "label": "Лёгкая уборка",
                "tasks": DEFAULT_TASK_SETS["light"],
            },
            {
                "id": "general",
                "label": "Генеральная уборка",
                "tasks": DEFAULT_TASK_SETS["general"],
            },
        ]
    }


@router.post("/reset-week", status_code=204)
def reset_week_tasks(
    db: Session = Depends(get_db),
    manager=Depends(require_manager),
):
    clear_tasks_for_apartment(db, manager.apartment_id)


@router.get("/templates/me", response_model=list[TaskTemplateResponse])
def list_my_templates(
    db: Session = Depends(get_db),
    member=Depends(require_manager),
):
    return (
        db.query(TaskTemplate)
        .filter(TaskTemplate.apartment_id == member.apartment_id)
        .order_by(TaskTemplate.id)
        .all()
    )


@router.post("/templates/me", response_model=TaskTemplateResponse)
def create_template_for_my_apartment(
    template_in: TaskTemplateCreate,
    db: Session = Depends(get_db),
    member=Depends(require_manager),
):
    template = TaskTemplate(
        apartment_id=member.apartment_id,
        name=template_in.name.strip(),
        description=template_in.description,
        is_global=False,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/me/{template_id}", status_code=204)
def delete_template_for_my_apartment(
    template_id: int,
    db: Session = Depends(get_db),
    member=Depends(require_manager),
):
    template = (
        db.query(TaskTemplate)
        .filter(
            TaskTemplate.id == template_id,
            TaskTemplate.apartment_id == member.apartment_id,
        )
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Шаблон не найден")

    db.delete(template)
    db.commit()


@router.get("/day/{day_of_week}", response_model=TaskListResponse)
def get_tasks_for_day(
    day_of_week: int = Path(..., ge=0, le=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    _validate_day(day_of_week)
    seed_tasks_for_day(db, member.apartment_id, day_of_week)

    tasks = (
        db.query(Task)
        .filter(
            Task.apartment_id == member.apartment_id,
            Task.day_of_week == day_of_week,
        )
        .order_by(Task.id)
        .all()
    )

    done = sum(1 for t in tasks if t.is_done)
    can_toggle = can_toggle_tasks_for_user(
        db, current_user.id, member.apartment_id, day_of_week
    )
    is_my_day = user_owns_cleaning_day(
        db, current_user.id, member.apartment_id, day_of_week
    )
    used = weekly_cleanings_count(db, current_user.id)
    remaining = weekly_cleanings_remaining(db, current_user.id)

    return TaskListResponse(
        day_of_week=day_of_week,
        tasks=[_task_to_response(t, current_user.id) for t in tasks],
        total=len(tasks),
        completed=done,
        progress_percent=int((done / len(tasks)) * 100) if tasks else 0,
        can_toggle=can_toggle,
        is_my_cleaning_day_today=is_my_day,
        weekly_cleanings_used=used,
        weekly_cleanings_limit=settings.max_cleanings_per_week,
        weekly_cleanings_remaining=remaining,
    )


@router.get("/{day_of_week}", response_model=TaskListResponse, include_in_schema=False)
def get_tasks_for_day_legacy(
    day_of_week: int = Path(..., ge=0, le=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    return get_tasks_for_day(day_of_week, db, current_user, member)


@router.post("/day/{day_of_week}/custom", response_model=TaskResponse, status_code=201)
def create_custom_task(
    day_of_week: int,
    body: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    _validate_day(day_of_week)
    task = Task(
        apartment_id=member.apartment_id,
        day_of_week=day_of_week,
        name=body.name.strip(),
        created_by_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_response(task, current_user.id)


@router.delete("/{task_id}", status_code=204)
def delete_custom_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    if task.apartment_id != member.apartment_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этой задаче")
    if not task.created_by_id:
        raise HTTPException(status_code=403, detail="Стандартные задачи удалить нельзя")
    if task.created_by_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Можно удалять только задачи, которые вы добавили",
        )

    db.delete(task)
    db.commit()


@router.post("/{task_id}/toggle", response_model=TaskResponse)
def toggle_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    member=Depends(get_current_apartment_member),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    if task.apartment_id != member.apartment_id:
        raise HTTPException(status_code=403, detail="Нет доступа к этой задаче")

    if not can_toggle_tasks_for_user(
        db, current_user.id, member.apartment_id, task.day_of_week
    ):
        raise HTTPException(
            status_code=403,
            detail="Отмечать задачи можно только в свой день уборки из расписания",
        )

    was_done = task.is_done
    day_tasks_before = (
        db.query(Task)
        .filter(
            Task.apartment_id == task.apartment_id,
            Task.day_of_week == task.day_of_week,
        )
        .all()
    )
    was_all_done = day_tasks_before and all(t.is_done for t in day_tasks_before)

    task.is_done = not task.is_done
    db.commit()
    db.refresh(task)

    day_tasks = (
        db.query(Task)
        .filter(
            Task.apartment_id == task.apartment_id,
            Task.day_of_week == task.day_of_week,
        )
        .all()
    )
    all_done_now = day_tasks and all(t.is_done for t in day_tasks)

    schedule = (
        db.query(Schedule)
        .filter(
            Schedule.day_of_week == task.day_of_week,
            Schedule.user_id == current_user.id,
            Schedule.apartment_id == member.apartment_id,
            Schedule.week_start == week_start(),
        )
        .first()
    )

    apartment = (
        db.query(Apartment).filter(Apartment.id == task.apartment_id).first()
    )

    if schedule and was_all_done and not all_done_now:
        revoke_cleaning_completion(db, current_user, apartment, task.day_of_week)
        db.commit()
        db.refresh(current_user)

    if schedule and all_done_now and not was_all_done:
        used = weekly_cleanings_count(db, current_user.id)
        if used >= settings.max_cleanings_per_week:
            task.is_done = False
            db.commit()
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Лимит уборок на неделю: {settings.max_cleanings_per_week}. "
                    "С понедельника лимит обновится."
                ),
            )

        db.add(
            WeeklyCleaningCompletion(
                user_id=current_user.id,
                apartment_id=member.apartment_id,
                week_start=week_start(),
                day_of_week=task.day_of_week,
            )
        )
        current_user.total_cleanings += 1
        db.add(current_user)
        if apartment:
            apartment.total_cleanings += 1
            db.add(apartment)
        db.commit()
        db.refresh(current_user)
        notify_event(
            "day_completed",
            f"{current_user.username} выполнил все задачи дня",
            apartment_id=member.apartment_id,
            data={"day_of_week": task.day_of_week},
        )

    return _task_to_response(task, current_user.id)
