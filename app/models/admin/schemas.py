from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.users.schemas import AdminUserSearchResult, UserApartmentInfo


class AdminResidentListItem(AdminUserSearchResult):
    is_blocked: bool = False


class AdminApartmentOverview(BaseModel):
    id: int
    building_code: str
    number: int
    current_residents: int
    max_residents: int
    total_cleanings: int
    violations_count: int
    pending_inspections: int
    manager_username: Optional[str] = None


class AdminApartmentMember(BaseModel):
    user_id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    total_cleanings: int
    is_admin: bool = False
    is_blocked: bool = False
    equipped_frame_code: Optional[str] = None
    admin_frame_color: Optional[str] = None
    admin_frame_style: Optional[str] = None


class AdminUserStats(BaseModel):
    user: AdminUserSearchResult
    is_blocked: bool
    bonus_tasks_this_week: list["AdminBonusTaskOut"] = []


class AdminBonusTaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    description: Optional[str] = Field(None, max_length=2000)
    week_start: Optional[date] = None


class AdminBonusTaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    week_start: date
    apartment_task_id: Optional[int] = None
    assigned_by_username: Optional[str] = None
    assigned_by_display_name: Optional[str] = None
    created_at: datetime


class UserBonusTaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    week_start: date
    assigned_by_username: str
    assigned_by_display_name: Optional[str] = None
    apartment_task_id: Optional[int] = None
    added_to_cleaning_day: bool = False
    created_at: datetime


class AdminUserRatingUpdate(BaseModel):
    total_cleanings: int = Field(..., ge=0, le=100000)


class AdminFrameColorUpdate(BaseModel):
    color: str = Field(..., min_length=1, max_length=16)


class AdminFrameStyleUpdate(BaseModel):
    style: str = Field(..., min_length=1, max_length=24)


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=10000)
    event_at: Optional[datetime] = None
    image_url: Optional[str] = None


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    image_url: Optional[str] = None
    event_at: Optional[datetime] = None
    created_by_id: int
    created_by_username: Optional[str] = None
    created_at: datetime
    is_read: bool = False
