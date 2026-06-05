from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    apartment_id: int
    day_of_week: int
    name: str
    is_done: bool
    created_by_id: Optional[int] = None
    is_custom: bool = False
    can_delete: bool = False


class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)


class TaskListResponse(BaseModel):
    day_of_week: int
    tasks: List[TaskResponse]
    total: int = 0
    completed: int = 0
    progress_percent: int = 0
    can_toggle: bool = False
    is_my_cleaning_day_today: bool = False
    weekly_cleanings_used: int = 0
    weekly_cleanings_limit: int = 2
    weekly_cleanings_remaining: int = 2


class TaskTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None


class TaskTemplateCreate(TaskTemplateBase):
    pass


class TaskTemplateResponse(TaskTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
