from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_of_week: int = Field(..., ge=0, le=6)
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_taken: bool
    week_start: date
    is_today: bool = False
