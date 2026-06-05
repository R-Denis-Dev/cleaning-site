from datetime import datetime

from pydantic import BaseModel, Field


class TaskCommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class TaskCommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    username: str
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DaySwapCreate(BaseModel):
    target_user_id: int
    my_schedule_id: int
    target_schedule_id: int


class DaySwapResponse(BaseModel):
    id: int
    requester_id: int
    requester_username: str
    target_user_id: int
    target_username: str
    requester_schedule_id: int
    target_schedule_id: int
    status: str
    created_at: datetime


class BuildingRoleAssign(BaseModel):
    user_id: int
    building_code: str
    role: str  # dispatcher | viewer
