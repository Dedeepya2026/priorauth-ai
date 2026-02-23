"""
Seed script — populates the database with demo data for testing.
Run: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal, Base
from models import User, Patient, PARequest, DenialRecord, ClinicalNote
from services.auth_service import hash_password
from datetime import datetime, timezone, timedelta
import random
import json

# Create tables
Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("[*] Seeding database...")

# --- Users ---
users_data = [
    {"email": "nurse@clinic.com", "password": "password123", "full_name": "Sarah Johnson, RN", "role": "nurse_coordinator", "specialty": "Orthopedics"},
    {"email": "doctor@clinic.com", "password": "password123", "full_name": "Dr. Michael Chen", "role": "provider", "specialty": "Cardiology"},
    {"email": "manager@clinic.com", "password": "password123", "full_name": "Lisa Rodriguez", "role": "manager", "specialty": None},
    {"email": "admin@clinic.com", "password": "password123", "full_name": "Admin User", "role": "admin", "specialty": None},
    {"email": "ortho@clinic.com", "password": "password123", "full_name": "Dr. James Wilson", "role": "provider", "specialty": "Orthopedics"},
    {"email": "gi@clinic.com", "password": "password123", "full_name": "Dr. Priya Patel", "role": "provider", "specialty": "Gastroenterology"},
]
users = []
for u in users_data:
    existing = db.query(User).filter(User.email == u["email"]).first()
    if not existing:
        user = User(email=u["email"], hashed_password=hash_password(u["password"]), full_name=u["full_name"], role=u["role"], specialty=u["specialty"])
        db.add(user)
        db.flush()
        users.append(user)
    else:
        users.append(existing)

# --- Patients ---
patients_data = [
    {"mrn": "MRN-001", "first_name": "Robert", "last_name": "Thompson", "date_of_birth": "1965-03-15", "insurance_id": "BC-98765432", "payer_name": "Blue Cross Blue Shield", "diagnosis_codes": "M17.11,M79.3"},
    {"mrn": "MRN-002", "first_name": "Maria", "last_name": "Garcia", "date_of_birth": "1978-07-22", "insurance_id": "AE-12345678", "payer_name": "Aetna", "diagnosis_codes": "I25.10,I10"},
    {"mrn": "MRN-003", "first_name": "James", "last_name": "Williams", "date_of_birth": "1955-11-08", "insurance_id": "UN-45678901", "payer_name": "UnitedHealthcare", "diagnosis_codes": "K57.30,K21.0"},
    {"mrn": "MRN-004", "first_name": "Angela", "last_name": "Davis", "date_of_birth": "1982-01-30", "insurance_id": "CG-33445566", "payer_name": "Cigna", "diagnosis_codes": "M75.111"},
    {"mrn": "MRN-005", "first_name": "David", "last_name": "Lee", "date_of_birth": "1970-09-12", "insurance_id": "HM-77889900", "payer_name": "Humana", "diagnosis_codes": "M54.5,G89.29"},
    {"mrn": "MRN-006", "first_name": "Patricia", "last_name": "Brown", "date_of_birth": "1960-04-18", "insurance_id": "BC-11223344", "payer_name": "Blue Cross Blue Shield", "diagnosis_codes": "I48.91,I50.9"},
    {"mrn": "MRN-007", "first_name": "Michael", "last_name": "Johnson", "date_of_birth": "1988-12-05", "insurance_id": "AE-55667788", "payer_name": "Aetna", "diagnosis_codes": "M23.611"},
    {"mrn": "MRN-008", "first_name": "Jennifer", "last_name": "Martinez", "date_of_birth": "1975-06-20", "insurance_id": "UN-99001122", "payer_name": "UnitedHealthcare", "diagnosis_codes": "K80.20"},
]
patients = []
for p in patients_data:
    existing = db.query(Patient).filter(Patient.mrn == p["mrn"]).first()
    if not existing:
        patient = Patient(**p)
        db.add(patient)
        db.flush()
        patients.append(patient)
    else:
        patients.append(existing)

# --- PA Requests ---
procedures = [
    ("27447", "Total Knee Arthroplasty", "M17.11", "Primary osteoarthritis, right knee"),
    ("93458", "Left Heart Catheterization", "I25.10", "Atherosclerotic heart disease"),
    ("45378", "Diagnostic Colonoscopy", "K57.30", "Diverticulosis of large intestine"),
    ("73721", "MRI Lower Extremity", "M75.111", "Right rotator cuff tear"),
    ("27446", "Revision Knee Arthroplasty", "M54.5", "Low back pain"),
    ("93306", "Transthoracic Echocardiography", "I48.91", "Atrial fibrillation"),
    ("29881", "Knee Arthroscopy", "M23.611", "Loose body in right knee"),
    ("43239", "Upper GI Endoscopy w/ Biopsy", "K80.20", "Gallstone without cholecystitis"),
    ("72148", "MRI Lumbar Spine", "M54.5", "Low back pain"),
    ("93010", "ECG Interpretation", "I10", "Essential hypertension"),
]

statuses = ["draft", "pending_review", "submitted", "approved", "denied", "appeal_draft"]
denial_reasons = [
    "missing_clinical_info", "medical_necessity_not_met", "coding_error",
    "incomplete_documentation", "policy_exclusion", "experimental_treatment",
    "out_of_network", "duplicate_request",
]

pa_requests = []
for i in range(20):
    proc = procedures[i % len(procedures)]
    patient = patients[i % len(patients)]
    status = statuses[i % len(statuses)]
    days_ago = random.randint(1, 90)
    created = datetime.now(timezone.utc) - timedelta(days=days_ago)
    
    pa = PARequest(
        reference_number=f"PA-2026{str(i+1).zfill(4)}-{random.randint(100,999)}",
        patient_id=patient.id,
        procedure_code=proc[0],
        procedure_name=proc[1],
        diagnosis_code=proc[2],
        diagnosis_name=proc[3],
        payer_name=patient.payer_name or "Blue Cross Blue Shield",
        status=status,
        priority=random.choice(["standard", "urgent", "standard", "standard"]),
        clinical_rationale=f"Patient presents with {proc[3]}. Conservative treatment including physical therapy and medication management has been attempted for 6+ weeks with inadequate response. The requested procedure is medically necessary for definitive treatment.",
        submitted_by=users[0].id,
        created_at=created,
        updated_at=created + timedelta(days=random.randint(0, 5)),
    )
    
    if status == "submitted":
        pa.submitted_at = created + timedelta(days=1)
    elif status == "approved":
        pa.submitted_at = created + timedelta(days=1)
        pa.resolved_at = created + timedelta(days=random.randint(3, 14))
        pa.turnaround_days = random.uniform(2, 12)
    elif status == "denied":
        pa.submitted_at = created + timedelta(days=1)
        pa.resolved_at = created + timedelta(days=random.randint(3, 14))
        pa.turnaround_days = random.uniform(3, 21)
        pa.denial_reason = random.choice(denial_reasons)
        pa.denial_details = f"The request for {proc[1]} was denied due to: {pa.denial_reason.replace('_', ' ')}"
    
    existing = db.query(PARequest).filter(PARequest.reference_number == pa.reference_number).first()
    if not existing:
        db.add(pa)
        db.flush()
        pa_requests.append(pa)
    else:
        pa_requests.append(existing)

# --- Denial Records ---
months = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]
for i, pa in enumerate(pa_requests):
    if pa.status == "denied" and pa.denial_reason:
        existing = db.query(DenialRecord).filter(DenialRecord.pa_request_id == pa.id).first()
        if not existing:
            dr = DenialRecord(
                pa_request_id=pa.id,
                denial_reason=pa.denial_reason,
                denial_category=pa.denial_reason,
                payer_name=pa.payer_name,
                procedure_code=pa.procedure_code,
                specialty=random.choice(["Orthopedics", "Cardiology", "Gastroenterology", "Imaging"]),
                turnaround_days=pa.turnaround_days,
                month=random.choice(months),
                root_cause=random.choice([
                    "Insufficient clinical documentation",
                    "Missing prior therapy records",
                    "Incorrect procedure code",
                    "Policy criteria not addressed",
                    "Outdated clinical information",
                    "Missing imaging results",
                ]),
            )
            db.add(dr)

# Add extra denial records for richer analytics
for month in months:
    for _ in range(random.randint(3, 8)):
        proc = random.choice(procedures)
        payer = random.choice(["Blue Cross Blue Shield", "Aetna", "UnitedHealthcare", "Cigna", "Humana"])
        dr = DenialRecord(
            pa_request_id=pa_requests[0].id if pa_requests else 1,
            denial_reason=random.choice(denial_reasons),
            denial_category=random.choice(denial_reasons),
            payer_name=payer,
            procedure_code=proc[0],
            specialty=random.choice(["Orthopedics", "Cardiology", "Gastroenterology", "Imaging"]),
            turnaround_days=random.uniform(2, 25),
            month=month,
            appealed=random.choice(["yes", "no", "no"]),
            appeal_outcome=random.choice(["overturned", "upheld", None]),
            root_cause=random.choice([
                "Insufficient clinical documentation",
                "Missing prior therapy records",
                "Incorrect procedure code",
                "Policy criteria not addressed",
                "Outdated clinical information",
                "Missing imaging results",
            ]),
        )
        db.add(dr)

db.commit()
print("[OK] Seeded successfully!")
print(f"   Users: {len(users_data)}")
print(f"   Patients: {len(patients_data)}")
print(f"   PA Requests: 20")
print(f"   Denial Records: {db.query(DenialRecord).count()}")
print("\nDemo logins:")
for u in users_data:
    print(f"   {u['role']:20s} -> {u['email']} / {u['password']}")

db.close()
