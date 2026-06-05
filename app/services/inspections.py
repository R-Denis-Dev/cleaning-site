from sqlalchemy.orm import Session, joinedload

from app.models.housing.models import Apartment
from app.models.inspections.models import ApartmentInspection
from app.models.inspections.schemas import InspectionResponse, ViolationResponse
from app.models.users.models import User


def inspection_to_response(
    db: Session, inspection: ApartmentInspection
) -> InspectionResponse:
    apartment = (
        db.query(Apartment)
        .options(joinedload(Apartment.building))
        .filter(Apartment.id == inspection.apartment_id)
        .first()
    )
    assigned_by = db.query(User).filter(User.id == inspection.assigned_by_id).first()
    return InspectionResponse(
        id=inspection.id,
        apartment_id=inspection.apartment_id,
        building_code=apartment.building.code if apartment else "",
        apartment_number=apartment.number if apartment else 0,
        assigned_by_id=inspection.assigned_by_id,
        assigned_by_username=assigned_by.username if assigned_by else "",
        scheduled_at=inspection.scheduled_at,
        status=inspection.status,
        notes=inspection.notes,
        created_at=inspection.created_at,
        completed_at=inspection.completed_at,
        violations=[
            ViolationResponse.model_validate(v) for v in inspection.violations
        ],
    )
