from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id = Column(Integer, primary_key=True, index=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_global = Column(Boolean, default=False, nullable=False)

    apartment = relationship("Apartment", back_populates="task_templates")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    is_done = Column(Boolean, default=False, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
