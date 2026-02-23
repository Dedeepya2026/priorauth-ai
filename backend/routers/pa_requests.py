import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from database import get_db
from models import PARequest, Patient, Document, DenialRecord, User
from schemas import PARequestCreate, PARequestUpdate, PARequestOut, PatientCreate, PatientOut
from services.auth_service import get_current_user
from services.ai_service import generate_pa_packet, generate_appeal_letter

router = APIRouter(prefix="/api/pa-requests", tags=["PA Requests"])


def _gen_ref():
    return f"PA-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


# --- Patient helpers ---
@router.post("/patients", response_model=PatientOut)
def create_patient(data: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = Patient(**data.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return PatientOut.model_validate(patient)


@router.get("/patients", response_model=list[PatientOut])
def list_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [PatientOut.model_validate(p) for p in db.query(Patient).all()]


class QuickPatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[str] = None
    insurance_id: Optional[str] = None
    payer_name: Optional[str] = None


@router.post("/patients/quick-create", response_model=PatientOut)
@router.post("/patients/quick-create/", response_model=PatientOut, include_in_schema=False)
def quick_create_patient(data: QuickPatientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a patient with minimal info — auto-generates MRN."""
    first = data.first_name.strip()
    last = data.last_name.strip()
    if not first or not last:
        raise HTTPException(status_code=400, detail="First and last name are required")
    # Check if patient already exists with same name
    existing = db.query(Patient).filter(
        Patient.first_name.ilike(first),
        Patient.last_name.ilike(last)
    ).first()
    if existing:
        return PatientOut.model_validate(existing)
    # Auto-generate MRN
    mrn = f"MRN-{uuid.uuid4().hex[:8].upper()}"
    dob = data.date_of_birth or "2000-01-01"
    patient = Patient(
        mrn=mrn,
        first_name=first,
        last_name=last,
        date_of_birth=dob,
        insurance_id=data.insurance_id,
        payer_name=data.payer_name,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return PatientOut.model_validate(patient)


# --- PA Request CRUD ---
@router.post("/", response_model=PARequestOut)
def create_pa_request(data: PARequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    pa = PARequest(
        reference_number=_gen_ref(),
        submitted_by=current_user.id,
        **data.model_dump(),
    )
    db.add(pa)
    db.commit()
    db.refresh(pa)
    return PARequestOut.model_validate(pa)


@router.get("/", response_model=list[PARequestOut])
def list_pa_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PARequest).options(joinedload(PARequest.patient), joinedload(PARequest.documents))
    if status:
        query = query.filter(PARequest.status == status)
    pas = query.order_by(PARequest.created_at.desc()).all()
    return [PARequestOut.model_validate(pa) for pa in pas]


@router.get("/{pa_id}", response_model=PARequestOut)
def get_pa_request(pa_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pa = db.query(PARequest).options(
        joinedload(PARequest.patient), joinedload(PARequest.documents)
    ).filter(PARequest.id == pa_id).first()
    if not pa:
        raise HTTPException(status_code=404, detail="PA Request not found")
    return PARequestOut.model_validate(pa)


@router.patch("/{pa_id}", response_model=PARequestOut)
def update_pa_request(
    pa_id: int,
    data: PARequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pa = db.query(PARequest).filter(PARequest.id == pa_id).first()
    if not pa:
        raise HTTPException(status_code=404, detail="PA Request not found")
    update_data = data.model_dump(exclude_unset=True)

    # Handle status transitions
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "submitted":
            update_data["submitted_at"] = datetime.now(timezone.utc)
        if new_status in ("approved", "denied", "appeal_approved", "appeal_denied"):
            update_data["resolved_at"] = datetime.now(timezone.utc)
            if pa.submitted_at:
                delta = datetime.now(timezone.utc) - pa.submitted_at
                update_data["turnaround_days"] = round(delta.total_seconds() / 86400, 1)
        if new_status == "denied" and update_data.get("denial_reason"):
            denial = DenialRecord(
                pa_request_id=pa.id,
                denial_reason=update_data.get("denial_reason", ""),
                denial_category=update_data.get("denial_reason", ""),
                payer_name=pa.payer_name,
                procedure_code=pa.procedure_code,
                turnaround_days=update_data.get("turnaround_days"),
                month=datetime.now().strftime("%Y-%m"),
            )
            db.add(denial)

    for key, val in update_data.items():
        setattr(pa, key, val)
    db.commit()
    db.refresh(pa)
    return PARequestOut.model_validate(pa)


@router.post("/{pa_id}/generate-packet", response_model=PARequestOut)
def generate_packet(pa_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pa = db.query(PARequest).options(
        joinedload(PARequest.patient), joinedload(PARequest.documents)
    ).filter(PARequest.id == pa_id).first()
    if not pa:
        raise HTTPException(status_code=404, detail="PA Request not found")

    # Gather extracted data from documents
    extracted = {}
    for doc in pa.documents:
        if doc.extracted_data:
            try:
                extracted.update(json.loads(doc.extracted_data))
            except json.JSONDecodeError:
                pass

    patient_name = f"{pa.patient.first_name} {pa.patient.last_name}" if pa.patient else "Unknown"
    result = generate_pa_packet(
        patient_name=patient_name,
        diagnosis_code=pa.diagnosis_code,
        diagnosis_name=pa.diagnosis_name or "",
        procedure_code=pa.procedure_code,
        procedure_name=pa.procedure_name,
        payer_name=pa.payer_name,
        clinical_rationale=pa.clinical_rationale or "",
        extracted_data=extracted,
    )
    pa.generated_packet = result["packet"]
    pa.completeness_checklist = result["checklist"]
    pa.missing_evidence = result["missing_evidence"]
    if pa.status == "draft":
        pa.status = "pending_review"
    db.commit()
    db.refresh(pa)
    return PARequestOut.model_validate(pa)


@router.post("/{pa_id}/generate-appeal", response_model=PARequestOut)
def generate_appeal(pa_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pa = db.query(PARequest).options(joinedload(PARequest.patient)).filter(PARequest.id == pa_id).first()
    if not pa:
        raise HTTPException(status_code=404, detail="PA Request not found")
    if pa.status not in ("denied", "appeal_denied"):
        raise HTTPException(status_code=400, detail="Can only appeal denied requests")

    patient_name = f"{pa.patient.first_name} {pa.patient.last_name}" if pa.patient else "Unknown"
    appeal = generate_appeal_letter(
        patient_name=patient_name,
        reference_number=pa.reference_number,
        denial_reason=pa.denial_reason or "Not specified",
        denial_details=pa.denial_details or "",
        procedure_code=pa.procedure_code,
        procedure_name=pa.procedure_name,
        diagnosis_code=pa.diagnosis_code,
        diagnosis_name=pa.diagnosis_name or "",
        payer_name=pa.payer_name,
        clinical_rationale=pa.clinical_rationale or "",
    )
    pa.appeal_letter = appeal
    pa.status = "appeal_draft"
    db.commit()
    db.refresh(pa)
    return PARequestOut.model_validate(pa)
