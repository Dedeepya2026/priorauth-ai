from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from database import Base


class UserRole(str, enum.Enum):
    NURSE_COORDINATOR = "nurse_coordinator"
    PROVIDER = "provider"
    MANAGER = "manager"
    ADMIN = "admin"


class PAStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    DENIED = "denied"
    APPEAL_DRAFT = "appeal_draft"
    APPEAL_SUBMITTED = "appeal_submitted"
    APPEAL_APPROVED = "appeal_approved"
    APPEAL_DENIED = "appeal_denied"


class DenialReason(str, enum.Enum):
    MISSING_CLINICAL = "missing_clinical_info"
    MEDICAL_NECESSITY = "medical_necessity_not_met"
    CODING_ERROR = "coding_error"
    OUT_OF_NETWORK = "out_of_network"
    DUPLICATE = "duplicate_request"
    EXPERIMENTAL = "experimental_treatment"
    INCOMPLETE_DOCS = "incomplete_documentation"
    POLICY_EXCLUSION = "policy_exclusion"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.NURSE_COORDINATOR.value)
    specialty = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(String(20), nullable=False)
    insurance_id = Column(String(100), nullable=True)
    payer_name = Column(String(200), nullable=True)
    diagnosis_codes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    pa_requests = relationship("PARequest", back_populates="patient")


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=True)
    content_type = Column(String(100), nullable=True)
    extracted_text = Column(Text, nullable=True)
    extracted_data = Column(Text, nullable=True)  # JSON string of structured extraction
    pa_request_id = Column(Integer, ForeignKey("pa_requests.id"), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    pa_request = relationship("PARequest", back_populates="documents")


class PARequest(Base):
    __tablename__ = "pa_requests"
    id = Column(Integer, primary_key=True, index=True)
    reference_number = Column(String(50), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    procedure_code = Column(String(20), nullable=False)
    procedure_name = Column(String(300), nullable=False)
    diagnosis_code = Column(String(20), nullable=False)
    diagnosis_name = Column(String(300), nullable=True)
    payer_name = Column(String(200), nullable=False)
    status = Column(String(50), nullable=False, default=PAStatus.DRAFT.value)
    priority = Column(String(20), nullable=True, default="standard")
    clinical_rationale = Column(Text, nullable=True)
    generated_packet = Column(Text, nullable=True)  # AI-generated PA packet
    completeness_checklist = Column(Text, nullable=True)  # JSON checklist
    missing_evidence = Column(Text, nullable=True)  # JSON list of missing items
    appeal_letter = Column(Text, nullable=True)
    denial_reason = Column(String(100), nullable=True)
    denial_details = Column(Text, nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    submitted_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    turnaround_days = Column(Float, nullable=True)
    patient = relationship("Patient", back_populates="pa_requests")
    documents = relationship("Document", back_populates="pa_request")


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    provider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    note_type = Column(String(50), nullable=False, default="SOAP")  # SOAP, H&P
    subjective = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    full_note = Column(Text, nullable=True)
    suggested_codes = Column(Text, nullable=True)  # JSON list of suggested codes
    ai_suggestions = Column(Text, nullable=True)  # JSON AI improvement suggestions
    status = Column(String(50), nullable=False, default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DenialRecord(Base):
    __tablename__ = "denial_records"
    id = Column(Integer, primary_key=True, index=True)
    pa_request_id = Column(Integer, ForeignKey("pa_requests.id"), nullable=False)
    denial_reason = Column(String(100), nullable=False)
    denial_category = Column(String(100), nullable=True)
    payer_name = Column(String(200), nullable=False)
    procedure_code = Column(String(20), nullable=True)
    specialty = Column(String(100), nullable=True)
    turnaround_days = Column(Float, nullable=True)
    appealed = Column(String(10), nullable=False, default="no")
    appeal_outcome = Column(String(50), nullable=True)
    root_cause = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    month = Column(String(7), nullable=True)  # e.g. "2026-01"
