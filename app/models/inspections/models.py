from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class ApartmentInspection(Base):
    __tablename__ = "apartment_inspections"

    id = Column(Integer, primary_key=True, index=True)
    apartment_id = Column(Integer, ForeignKey("apartments.id"), nullable=False, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    status = Column(String, default="pending", nullable=False)  # pending | completed | cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    apartment = relationship("Apartment", back_populates="inspections")
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
    violations = relationship(
        "InspectionViolation",
        back_populates="inspection",
        cascade="all, delete-orphan",
    )


class InspectionViolation(Base):
    __tablename__ = "inspection_violations"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(
        Integer, ForeignKey("apartment_inspections.id"), nullable=False, index=True
    )
    category = Column(String, nullable=False)
    score = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    inspection = relationship("ApartmentInspection", back_populates="violations")
