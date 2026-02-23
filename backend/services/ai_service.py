"""
AI Service — Mock/Local AI for PA packet generation, appeal letters, clinical notes, and code suggestions.

All functions return realistic structured responses. In production, swap these with actual LLM API calls
(OpenAI, Anthropic, local Ollama, etc.) by changing the implementation inside each function.
"""
import json
from datetime import datetime


def generate_pa_packet(
    patient_name: str,
    diagnosis_code: str,
    diagnosis_name: str,
    procedure_code: str,
    procedure_name: str,
    payer_name: str,
    clinical_rationale: str = "",
    extracted_data: dict = None,
) -> dict:
    """Generate a PA packet draft with citations and missing-evidence flags."""
    extracted = extracted_data or {}
    
    packet = f"""PRIOR AUTHORIZATION REQUEST
{'='*60}

Date: {datetime.now().strftime('%B %d, %Y')}
Payer: {payer_name}
Reference: Auto-generated draft — requires human review

PATIENT INFORMATION
-------------------
Patient: {patient_name}
Diagnosis: {diagnosis_code} — {diagnosis_name}
{f"Insurance ID: {extracted.get('insurance_id', 'N/A')}" }

REQUESTED SERVICE
-----------------
Procedure: {procedure_code} — {procedure_name}
Medical Necessity: Yes — see clinical rationale below

CLINICAL RATIONALE
------------------
{clinical_rationale or 'Clinical rationale pending — please provide details about medical necessity.'}

{f"Prior Therapy: {extracted.get('prior_therapy', 'Not documented')}" }
{f"Current Medications: {extracted.get('medications', 'Not documented')}" }
{f"Imaging Results: {extracted.get('imaging_results', 'Not documented')}" }
{f"Lab Results: {extracted.get('lab_results', 'Not documented')}" }

SUPPORTING EVIDENCE
-------------------
• Diagnosis {diagnosis_code} meets medical necessity criteria per {payer_name} policy guidelines
• Conservative treatment has been attempted as documented in clinical records
• The requested procedure is the appropriate next step in the treatment plan
• Clinical documentation supports the need for {procedure_name}

CITATIONS
---------
[1] {payer_name} Medical Policy — {procedure_code} Authorization Requirements
[2] AMA CPT Guidelines — {procedure_code} Indications
[3] Clinical Practice Guidelines — {diagnosis_name} Management
[4] Patient medical records — see attached documentation

ATTESTATION
-----------
I certify that the information provided is accurate and complete. The requested
service is medically necessary for the treatment of the patient's condition.

Provider Signature: _________________________  Date: __________
"""

    # Generate completeness checklist
    checklist = [
        {"item": "Patient demographics", "complete": True, "source": "Intake form"},
        {"item": "Insurance information", "complete": bool(extracted.get("insurance_id")), "source": "Insurance card"},
        {"item": "Diagnosis code (ICD-10)", "complete": bool(diagnosis_code), "source": "Provider assessment"},
        {"item": "Procedure code (CPT)", "complete": bool(procedure_code), "source": "Order form"},
        {"item": "Clinical rationale", "complete": bool(clinical_rationale), "source": "Provider notes"},
        {"item": "Prior therapy documentation", "complete": bool(extracted.get("prior_therapy")), "source": "Medical records"},
        {"item": "Imaging/lab results", "complete": bool(extracted.get("imaging_results") or extracted.get("lab_results")), "source": "Diagnostic reports"},
        {"item": "Medication history", "complete": bool(extracted.get("medications")), "source": "Medication list"},
        {"item": "Provider attestation", "complete": False, "source": "Requires signature"},
    ]

    missing = [c["item"] for c in checklist if not c["complete"]]

    return {
        "packet": packet,
        "checklist": json.dumps(checklist),
        "missing_evidence": json.dumps(missing),
    }


def generate_appeal_letter(
    patient_name: str,
    reference_number: str,
    denial_reason: str,
    denial_details: str,
    procedure_code: str,
    procedure_name: str,
    diagnosis_code: str,
    diagnosis_name: str,
    payer_name: str,
    clinical_rationale: str = "",
) -> str:
    """Generate an appeal letter for a denied PA request."""
    return f"""APPEAL LETTER — PRIOR AUTHORIZATION DENIAL
{'='*60}

Date: {datetime.now().strftime('%B %d, %Y')}

{payer_name}
Medical Review Department

Re: Appeal of Prior Authorization Denial
    Reference Number: {reference_number}
    Patient: {patient_name}
    Procedure: {procedure_code} — {procedure_name}
    Denial Reason: {denial_reason}

Dear Medical Review Board,

I am writing to formally appeal the denial of prior authorization for {procedure_name}
(CPT {procedure_code}) for our patient, {patient_name}, diagnosed with {diagnosis_name}
(ICD-10: {diagnosis_code}).

REASON FOR APPEAL
-----------------
The denial was issued citing: "{denial_reason}"
{f"Details: {denial_details}" if denial_details else ""}

We respectfully disagree with this determination for the following reasons:

1. MEDICAL NECESSITY
   {clinical_rationale or "The patient's condition requires this procedure based on clinical assessment and failure of conservative treatment measures."}

2. CLINICAL EVIDENCE
   • The patient has undergone appropriate conservative management
   • Clinical documentation demonstrates progressive symptoms
   • Current medical literature supports this intervention for the documented diagnosis
   • The procedure aligns with evidence-based clinical practice guidelines

3. POLICY COMPLIANCE
   • This request meets the criteria outlined in {payer_name}'s medical policy
   • All required documentation has been submitted
   • The treating provider has determined this is the medically appropriate course of treatment

4. SUPPORTING REFERENCES
   [1] {payer_name} Medical Policy for {procedure_code}
   [2] American Medical Association Clinical Guidelines
   [3] Peer-reviewed literature supporting {procedure_name} for {diagnosis_name}
   [4] Patient's complete medical records (attached)

REQUEST
-------
We kindly request that you reconsider this denial and approve the prior authorization
for {procedure_name}. Additional clinical documentation is available upon request.

Should you require a peer-to-peer review, the treating physician is available at your
earliest convenience.

Respectfully submitted,

_________________________
Treating Provider
Date: __________
"""


def generate_clinical_note(
    note_type: str,
    patient_name: str,
    subjective: str = "",
    objective: str = "",
    assessment: str = "",
    plan: str = "",
) -> dict:
    """Generate AI-assisted clinical note suggestions and code recommendations."""
    
    suggestions = []
    if not subjective:
        suggestions.append({
            "section": "Subjective",
            "suggestion": "Document chief complaint, history of present illness, symptom onset/duration/severity, and relevant review of systems.",
        })
    if not objective:
        suggestions.append({
            "section": "Objective",
            "suggestion": "Document vital signs, physical examination findings, and relevant diagnostic results.",
        })
    if not assessment:
        suggestions.append({
            "section": "Assessment",
            "suggestion": "Document primary and secondary diagnoses with ICD-10 codes, clinical reasoning, and differential diagnoses considered.",
        })
    if not plan:
        suggestions.append({
            "section": "Plan",
            "suggestion": "Document treatment plan, medications prescribed, follow-up schedule, referrals, and patient education provided.",
        })

    # Suggest codes based on content
    suggested_codes = []
    text_combined = f"{subjective} {objective} {assessment} {plan}".lower()
    
    code_mappings = [
        (["knee", "meniscus", "acl", "ligament"], {"code": "M23.611", "description": "Loose body in right knee", "type": "ICD-10"}),
        (["shoulder", "rotator", "impingement"], {"code": "M75.111", "description": "Right rotator cuff tear", "type": "ICD-10"}),
        (["back", "lumbar", "spine", "disc"], {"code": "M54.5", "description": "Low back pain", "type": "ICD-10"}),
        (["chest", "cardiac", "heart", "angina"], {"code": "I25.10", "description": "Atherosclerotic heart disease", "type": "ICD-10"}),
        (["colon", "gastro", "gi", "abdominal"], {"code": "K57.30", "description": "Diverticulosis of large intestine", "type": "ICD-10"}),
        (["mri", "imaging"], {"code": "73721", "description": "MRI lower extremity without contrast", "type": "CPT"}),
        (["physical therapy", "pt", "rehabilitation"], {"code": "97110", "description": "Therapeutic exercises", "type": "CPT"}),
        (["injection", "steroid"], {"code": "20610", "description": "Arthrocentesis/injection major joint", "type": "CPT"}),
    ]
    
    for keywords, code_info in code_mappings:
        if any(kw in text_combined for kw in keywords):
            suggested_codes.append(code_info)

    if not suggested_codes:
        suggested_codes.append({"code": "99214", "description": "Office visit, established patient, moderate complexity", "type": "CPT"})

    full_note = ""
    if note_type == "SOAP":
        full_note = f"""SOAP NOTE — {patient_name}
Date: {datetime.now().strftime('%B %d, %Y')}

SUBJECTIVE:
{subjective or '[Pending documentation]'}

OBJECTIVE:
{objective or '[Pending documentation]'}

ASSESSMENT:
{assessment or '[Pending documentation]'}

PLAN:
{plan or '[Pending documentation]'}
"""
    else:
        full_note = f"""HISTORY & PHYSICAL — {patient_name}
Date: {datetime.now().strftime('%B %d, %Y')}

CHIEF COMPLAINT:
{subjective or '[Pending documentation]'}

HISTORY OF PRESENT ILLNESS:
{subjective or '[Pending documentation]'}

PHYSICAL EXAMINATION:
{objective or '[Pending documentation]'}

ASSESSMENT & PLAN:
{assessment or '[Pending documentation]'}
{plan or '[Pending documentation]'}
"""

    return {
        "full_note": full_note,
        "suggested_codes": json.dumps(suggested_codes),
        "ai_suggestions": json.dumps(suggestions),
    }
