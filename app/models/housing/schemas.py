from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BuildingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str


class ApartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    number: int
    building_code: str
    current_residents: int
    max_residents: int = 8
    use_default_tasks: bool = True
    cleaning_mode: str = "general"
    description: Optional[str] = None
    description_updated_at: Optional[datetime] = None
    total_cleanings: int = 0
    equipped_frame_code: Optional[str] = None
    avatar_url: Optional[str] = None


class ApartmentSearchResult(BaseModel):
    id: int
    number: int
    building_code: str
    building_name: str
    current_residents: int
    max_residents: int
    description_preview: Optional[str] = None
    avatar_url: Optional[str] = None
    equipped_frame_code: Optional[str] = None
    total_cleanings: int = 0


class ApartmentDetailResponse(ApartmentResponse):
    members: list["ApartmentMemberResponse"] = []
    recent_inspections_count: int = 0


class ApartmentDescriptionUpdate(BaseModel):
    description: str = Field(..., max_length=2000)


class ApartmentMemberResponse(BaseModel):
    user_id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    equipped_frame_code: Optional[str] = None


class CleaningModeUpdate(BaseModel):
    mode: str = Field(..., pattern="^(light|general)$")
