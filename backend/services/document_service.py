import os
import uuid
import json
from config import settings


def save_file(file_bytes: bytes, original_filename: str, content_type: str) -> dict:
    """Save uploaded file to local uploads directory."""
    ext = os.path.splitext(original_filename)[1] or ".pdf"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    return {
        "filename": unique_name,
        "original_filename": original_filename,
        "file_path": file_path,
        "file_size": len(file_bytes),
        "content_type": content_type,
    }


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF using pdfplumber."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n\n".join(text_parts) if text_parts else "[No extractable text found in PDF]"
    except Exception as e:
        return f"[PDF extraction error: {str(e)}]"


def extract_structured_data(text: str) -> dict:
    """
    Simulate structured data extraction from clinical text.
    In production, this would use NLP/AI to parse clinical information.
    """
    data = {
        "patient_name": _find_pattern(text, ["patient:", "patient name:", "name:"]),
        "date_of_birth": _find_pattern(text, ["dob:", "date of birth:", "birth date:"]),
        "diagnosis": _find_pattern(text, ["diagnosis:", "dx:", "impression:", "assessment:"]),
        "medications": _find_pattern(text, ["medications:", "meds:", "current medications:"]),
        "procedures": _find_pattern(text, ["procedure:", "procedure requested:", "cpt:"]),
        "prior_therapy": _find_pattern(text, ["prior therapy:", "conservative treatment:", "previous treatment:"]),
        "imaging_results": _find_pattern(text, ["imaging:", "mri:", "ct:", "x-ray:", "radiology:"]),
        "lab_results": _find_pattern(text, ["labs:", "lab results:", "blood work:"]),
        "allergies": _find_pattern(text, ["allergies:", "allergy:"]),
        "insurance_id": _find_pattern(text, ["insurance:", "member id:", "policy:", "subscriber:"]),
    }
    return {k: v for k, v in data.items() if v}


def _find_pattern(text: str, prefixes: list) -> str:
    """Simple pattern finder — looks for lines starting with given prefixes."""
    text_lower = text.lower()
    for prefix in prefixes:
        idx = text_lower.find(prefix)
        if idx != -1:
            start = idx + len(prefix)
            end = text_lower.find("\n", start)
            if end == -1:
                end = min(start + 200, len(text))
            return text[start:end].strip()
    return ""
