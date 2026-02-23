import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Document, User
from schemas import DocumentOut
from services.auth_service import get_current_user
from services.document_service import save_file, extract_text_from_pdf, extract_structured_data

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    pa_request_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()
    file_info = save_file(contents, file.filename or "upload.pdf", file.content_type or "application/pdf")

    # Extract text from PDF
    extracted_text = ""
    extracted_data = {}
    if file.content_type == "application/pdf" or (file.filename and file.filename.lower().endswith(".pdf")):
        extracted_text = extract_text_from_pdf(file_info["file_path"])
        extracted_data = extract_structured_data(extracted_text)

    doc = Document(
        filename=file_info["filename"],
        original_filename=file_info["original_filename"],
        file_path=file_info["file_path"],
        file_size=file_info["file_size"],
        content_type=file_info["content_type"],
        extracted_text=extracted_text,
        extracted_data=json.dumps(extracted_data) if extracted_data else None,
        pa_request_id=pa_request_id,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.get("/", response_model=list[DocumentOut])
def list_documents(
    pa_request_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document)
    if pa_request_id:
        query = query.filter(Document.pa_request_id == pa_request_id)
    docs = query.order_by(Document.created_at.desc()).all()
    return [DocumentOut.model_validate(d) for d in docs]


@router.get("/{doc_id}", response_model=DocumentOut)
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(doc)
