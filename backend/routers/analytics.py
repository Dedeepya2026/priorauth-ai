from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import PARequest, DenialRecord, User
from schemas import AnalyticsOverview, DenialStat, TurnaroundStat
from services.auth_service import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(PARequest).count()
    approved = db.query(PARequest).filter(PARequest.status.in_(["approved", "appeal_approved"])).count()
    denied = db.query(PARequest).filter(PARequest.status.in_(["denied", "appeal_denied"])).count()
    pending = db.query(PARequest).filter(PARequest.status.in_(["draft", "pending_review", "submitted"])).count()

    avg_tat = db.query(func.avg(PARequest.turnaround_days)).filter(PARequest.turnaround_days.isnot(None)).scalar() or 0

    denial_rate = (denied / total * 100) if total > 0 else 0
    approval_rate = (approved / total * 100) if total > 0 else 0

    # Denial by reason
    denial_reasons_raw = (
        db.query(DenialRecord.denial_reason, func.count(DenialRecord.id))
        .group_by(DenialRecord.denial_reason)
        .all()
    )
    total_denials = sum(c for _, c in denial_reasons_raw) or 1
    denial_by_reason = [
        DenialStat(reason=r, count=c, percentage=round(c / total_denials * 100, 1))
        for r, c in denial_reasons_raw
    ]

    # Turnaround trend
    tat_raw = (
        db.query(DenialRecord.month, func.avg(DenialRecord.turnaround_days), func.count(DenialRecord.id))
        .filter(DenialRecord.month.isnot(None))
        .group_by(DenialRecord.month)
        .order_by(DenialRecord.month)
        .all()
    )
    turnaround_trend = [
        TurnaroundStat(month=m, avg_days=round(a or 0, 1), total_requests=c)
        for m, a, c in tat_raw
    ]

    # Top denied procedures
    top_procs = (
        db.query(DenialRecord.procedure_code, func.count(DenialRecord.id).label("cnt"))
        .group_by(DenialRecord.procedure_code)
        .order_by(func.count(DenialRecord.id).desc())
        .limit(5)
        .all()
    )
    top_denied_procedures = [{"procedure_code": p, "count": c} for p, c in top_procs]

    # Denial by payer
    payer_denials = (
        db.query(DenialRecord.payer_name, func.count(DenialRecord.id).label("cnt"))
        .group_by(DenialRecord.payer_name)
        .order_by(func.count(DenialRecord.id).desc())
        .all()
    )
    denial_by_payer = [{"payer_name": p, "count": c} for p, c in payer_denials]

    return AnalyticsOverview(
        total_pa_requests=total,
        approved=approved,
        denied=denied,
        pending=pending,
        avg_turnaround_days=round(avg_tat, 1),
        denial_rate=round(denial_rate, 1),
        approval_rate=round(approval_rate, 1),
        denial_by_reason=denial_by_reason,
        turnaround_trend=turnaround_trend,
        top_denied_procedures=top_denied_procedures,
        denial_by_payer=denial_by_payer,
    )
