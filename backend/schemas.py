import re
from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List
from datetime import datetime


# ── Validators ───────────────────────────────────────────
EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
VALID_ROLES = {"nurse_coordinator", "provider", "manager", "admin"}
VALID_STATUSES = {"draft", "pending_review", "submitted", "approved", "denied",
                  "appeal_draft", "appeal_submitted", "appeal_approved", "appeal_denied"}
VALID_PRIORITIES = {"standard", "urgent"}
VALID_NOTE_TYPES = {"SOAP", "H&P"}


# ── Auth ─────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "nurse_coordinator"
    specialty: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("Invalid email address format")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Full name must be at least 2 characters")
        if len(v) > 255:
            raise ValueError("Full name must be under 255 characters")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")
        return v


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v:
            raise ValueError("Password is required")
        return v


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    specialty: Optional[str] = None
    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Patient ──────────────────────────────────────────────
class PatientCreate(BaseModel):
    mrn: str
    first_name: str
    last_name: str
    date_of_birth: str
    insurance_id: Optional[str] = None
    payer_name: Optional[str] = None
    diagnosis_codes: Optional[str] = None

    @field_validator("mrn")
    @classmethod
    def validate_mrn(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("MRN is required")
        return v

    @field_validator("first_name", "last_name")
    @classmethod
    def validate_names(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 1:
            raise ValueError("Name is required")
        if len(v) > 100:
            raise ValueError("Name must be under 100 characters")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: str) -> str:
        v = v.strip()
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Date of birth must be in YYYY-MM-DD format")
        return v


class PatientOut(BaseModel):
    id: int
    mrn: str
    first_name: str
    last_name: str
    date_of_birth: str
    insurance_id: Optional[str] = None
    payer_name: Optional[str] = None
    diagnosis_codes: Optional[str] = None
    class Config:
        from_attributes = True


# ── Document ─────────────────────────────────────────────
class DocumentOut(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    extracted_text: Optional[str] = None
    extracted_data: Optional[str] = None
    pa_request_id: Optional[int] = None
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── PA Request ───────────────────────────────────────────
class PARequestCreate(BaseModel):
    patient_id: int
    procedure_code: str
    procedure_name: str
    diagnosis_code: str
    diagnosis_name: Optional[str] = None
    payer_name: str
    priority: Optional[str] = "standard"
    clinical_rationale: Optional[str] = None

    @field_validator("procedure_code")
    @classmethod
    def validate_procedure_code(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 20:
            raise ValueError("Procedure code is required and must be under 20 characters")
        return v

    @field_validator("procedure_name")
    @classmethod
    def validate_procedure_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Procedure name is required")
        return v

    @field_validator("diagnosis_code")
    @classmethod
    def validate_diagnosis_code(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 20:
            raise ValueError("Diagnosis code is required and must be under 20 characters")
        return v

    @field_validator("payer_name")
    @classmethod
    def validate_payer(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Payer name is required")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> str:
        if v and v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}")
        return v or "standard"


class PARequestUpdate(BaseModel):
    status: Optional[str] = None
    clinical_rationale: Optional[str] = None
    priority: Optional[str] = None
    denial_reason: Optional[str] = None
    denial_details: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v and v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of: {', '.join(VALID_PRIORITIES)}")
        return v


class PARequestOut(BaseModel):
    id: int
    reference_number: str
    patient_id: int
    procedure_code: str
    procedure_name: str
    diagnosis_code: str
    diagnosis_name: Optional[str] = None
    payer_name: str
    status: str
    priority: Optional[str] = None
    clinical_rationale: Optional[str] = None
    generated_packet: Optional[str] = None
    completeness_checklist: Optional[str] = None
    missing_evidence: Optional[str] = None
    appeal_letter: Optional[str] = None
    denial_reason: Optional[str] = None
    denial_details: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    turnaround_days: Optional[float] = None
    patient: Optional[PatientOut] = None
    documents: Optional[List[DocumentOut]] = []
    class Config:
        from_attributes = True


# ── Clinical Note ────────────────────────────────────────
class ClinicalNoteCreate(BaseModel):
    patient_id: int
    note_type: str = "SOAP"
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    full_note: Optional[str] = None

    @field_validator("note_type")
    @classmethod
    def validate_note_type(cls, v: str) -> str:
        if v not in VALID_NOTE_TYPES:
            raise ValueError(f"Note type must be one of: {', '.join(VALID_NOTE_TYPES)}")
        return v


class ClinicalNoteUpdate(BaseModel):
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    full_note: Optional[str] = None
    status: Optional[str] = None


class ClinicalNoteOut(BaseModel):
    id: int
    patient_id: int
    provider_id: int
    note_type: str
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    full_note: Optional[str] = None
    suggested_codes: Optional[str] = None
    ai_suggestions: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True


# ── Analytics ────────────────────────────────────────────
class DenialStat(BaseModel):
    reason: str
    count: int
    percentage: float

class TurnaroundStat(BaseModel):
    month: str
    avg_days: float
    total_requests: int

class AnalyticsOverview(BaseModel):
    total_pa_requests: int
    approved: int
    denied: int
    pending: int
    avg_turnaround_days: float
    denial_rate: float
    approval_rate: float
    denial_by_reason: List[DenialStat]
    turnaround_trend: List[TurnaroundStat]
    top_denied_procedures: List[dict]
    denial_by_payer: List[dict]
