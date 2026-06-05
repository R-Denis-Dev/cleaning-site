from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ViolationCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=80)
    score: Optional[int] = Field(None, ge=0, le=100)
    comment: Optional[str] = Field(None, max_length=500)


class ViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    score: Optional[int] = None
    comment: Optional[str] = None
    created_at: datetime


class InspectionCreate(BaseModel):
    apartment_id: int
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=1000)


class InspectionUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(pending|completed|cancelled)$")
    notes: Optional[str] = Field(None, max_length=1000)
    scheduled_at: Optional[datetime] = None


class InspectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    apartment_id: int
    building_code: str
    apartment_number: int
    assigned_by_id: int
    assigned_by_username: str
    scheduled_at: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    violations: list[ViolationResponse] = []
