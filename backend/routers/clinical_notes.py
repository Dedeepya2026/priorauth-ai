from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ClinicalNote, Patient, User
from schemas import ClinicalNoteCreate, ClinicalNoteUpdate, ClinicalNoteOut
from services.auth_service import get_current_user
from services.ai_service import generate_clinical_note

router = APIRouter(prefix="/api/clinical-notes", tags=["Clinical Notes"])


@router.post("/", response_model=ClinicalNoteOut)
def create_note(data: ClinicalNoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == data.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient_name = f"{patient.first_name} {patient.last_name}"
    ai_result = generate_clinical_note(
        note_type=data.note_type,
        patient_name=patient_name,
        subjective=data.subjective or "",
        objective=data.objective or "",
        assessment=data.assessment or "",
        plan=data.plan or "",
    )

    note = ClinicalNote(
        patient_id=data.patient_id,
        provider_id=current_user.id,
        note_type=data.note_type,
        subjective=data.subjective,
        objective=data.objective,
        assessment=data.assessment,
        plan=data.plan,
        full_note=ai_result["full_note"],
        suggested_codes=ai_result["suggested_codes"],
        ai_suggestions=ai_result["ai_suggestions"],
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return ClinicalNoteOut.model_validate(note)


@router.get("/", response_model=list[ClinicalNoteOut])
def list_notes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = db.query(ClinicalNote).order_by(ClinicalNote.created_at.desc()).all()
    return [ClinicalNoteOut.model_validate(n) for n in notes]


@router.get("/{note_id}", response_model=ClinicalNoteOut)
def get_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(ClinicalNote).filter(ClinicalNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return ClinicalNoteOut.model_validate(note)


@router.patch("/{note_id}", response_model=ClinicalNoteOut)
def update_note(note_id: int, data: ClinicalNoteUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(ClinicalNote).filter(ClinicalNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(note, key, val)
    db.commit()
    db.refresh(note)
    return ClinicalNoteOut.model_validate(note)


@router.post("/{note_id}/ai-assist", response_model=ClinicalNoteOut)
def ai_assist_note(note_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(ClinicalNote).filter(ClinicalNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    patient = db.query(Patient).filter(Patient.id == note.patient_id).first()
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown"

    ai_result = generate_clinical_note(
        note_type=note.note_type,
        patient_name=patient_name,
        subjective=note.subjective or "",
        objective=note.objective or "",
        assessment=note.assessment or "",
        plan=note.plan or "",
    )
    note.full_note = ai_result["full_note"]
    note.suggested_codes = ai_result["suggested_codes"]
    note.ai_suggestions = ai_result["ai_suggestions"]
    db.commit()
    db.refresh(note)
    return ClinicalNoteOut.model_validate(note)
