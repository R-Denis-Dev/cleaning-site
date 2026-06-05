from typing import Literal, Optional

from pydantic import BaseModel, Field


class FrameInfo(BaseModel):
    code: str
    name: str
    description: str
    target: Literal["user", "apartment"]
    kind: Literal["rank", "cleanings"]
    threshold: int
    ring_class: str
    unlocked: bool


class UserFramesResponse(BaseModel):
    equipped_frame_code: Optional[str] = None
    frames: list[FrameInfo]


class EquipFrameRequest(BaseModel):
    frame_code: Optional[str] = Field(
        None,
        description="Код рамки или null, чтобы снять",
    )


class LeaderboardUserEntry(BaseModel):
    id: int
    username: str
    total_cleanings: int = 0
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    equipped_frame_code: Optional[str] = None
    is_admin: bool = False
    admin_frame_color: Optional[str] = None
    admin_frame_style: Optional[str] = None
    rank: int


class LeaderboardApartmentEntry(BaseModel):
    id: int
    building_code: str
    apartment_number: int
    total_cleanings: int = 0
    equipped_frame_code: Optional[str] = None
    avatar_url: Optional[str] = None
    current_residents: int = 0
    rank: int
