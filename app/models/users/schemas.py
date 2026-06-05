from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=72)
    email: EmailStr


class UserApartmentInfo(BaseModel):
    building_code: str
    apartment_number: int
    role: str
    apartment_total_cleanings: int = 0
    apartment_equipped_frame_code: Optional[str] = None
    apartment_avatar_url: Optional[str] = None


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=80)
    bio: Optional[str] = Field(None, max_length=500)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    created_at: datetime
    apartment: Optional[UserApartmentInfo] = None
    total_cleanings: int = 0
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_admin: bool = False
    equipped_frame_code: Optional[str] = None
    admin_frame_color: Optional[str] = None
    admin_frame_style: Optional[str] = None


class PublicUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    total_cleanings: int = 0
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    apartment: Optional[UserApartmentInfo] = None
    equipped_frame_code: Optional[str] = None
    is_admin: bool = False
    admin_frame_color: Optional[str] = None
    admin_frame_style: Optional[str] = None


class AdminUserSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    total_cleanings: int = 0
    created_at: datetime
    is_admin: bool = False
    equipped_frame_code: Optional[str] = None
    admin_frame_color: Optional[str] = None
    admin_frame_style: Optional[str] = None
    apartment: Optional[UserApartmentInfo] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
