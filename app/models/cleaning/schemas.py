from datetime import date, datetime

from pydantic import BaseModel


class CleaningHistoryEntry(BaseModel):
    id: int
    user_id: int
    username: str
    display_name: str | None
    apartment_id: int
    week_start: date
    day_of_week: int
    completed_at: datetime
    photo_url: str | None = None


class MissedCleaningEntry(BaseModel):
    user_id: int
    username: str
    display_name: str | None
    day_of_week: int
    week_start: date


class CleaningReminder(BaseModel):
    kind: str
    message: str
    day_of_week: int | None = None
    incomplete_tasks: int = 0


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    code: str
    new_password: str
