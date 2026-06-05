from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)

    apartments = relationship("Apartment", back_populates="building")


class Apartment(Base):
    __tablename__ = "apartments"
    __table_args__ = (Index("ix_apartments_total_cleanings", "total_cleanings"),)

    id = Column(Integer, primary_key=True, index=True)
    building_id = Column(Integer, ForeignKey("buildings.id"), nullable=False)
    number = Column(Integer, nullable=False)
    max_residents = Column(Integer, default=8, nullable=False)
    total_cleanings = Column(Integer, default=0, nullable=False)
    equipped_frame_code = Column(String(64), nullable=True)
    avatar_url = Column(String, nullable=True)

    # флаг: использовать стандартный набор задач или свои шаблоны
    use_default_tasks = Column(Boolean, default=True, nullable=False)
    # light | general — тип стандартного набора
    cleaning_mode = Column(String, default="general", nullable=False)
    description = Column(Text, nullable=True)
    description_updated_at = Column(DateTime, nullable=True)
    description_updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    building = relationship("Building", back_populates="apartments")
    members = relationship("ApartmentMember", back_populates="apartment")
    task_templates = relationship("TaskTemplate", back_populates="apartment")
    inspections = relationship("ApartmentInspection", back_populates="apartment")


class ApartmentMember(Base):
    __tablename__ = "apartment_members"

    id = Column(Integer, primary_key=True, index=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="resident", nullable=False)

    apartment = relationship("Apartment", back_populates="members")
    user = relationship("User", back_populates="apartment_member")
