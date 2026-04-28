from collections import defaultdict
from datetime import datetime, time
from typing import List, Optional
import uuid

from sqlalchemy import String, case, cast, func, or_
from sqlmodel import Session, select

from .models import File, Job, StepMetric, User


SUCCESS = "success"
FAILED = "failed"
IN_PROGRESS = "in progress"


def normalize_status(raw: Optional[str]) -> str:
    if not raw:
        return IN_PROGRESS

    status = str(raw).strip().lower().replace("_", " ").replace("-", " ")
    if any(token in status for token in ("fail", "error", "exception")):
        return FAILED
    if any(token in status for token in ("success", "complete", "completed", "indexed", "comp")):
        return SUCCESS
    return IN_PROGRESS


def _real_files_filter(source=None):
    from sqlalchemy import func as sa_func
    # Isolate root records (exclude generator pages)
    # The user explicitly wants to exclude 'system' source files from the dashboard by default
    base_filter = (File.is_deleted == False) & (sa_func.lower(File.source) != "system") & (File.source_id != 'pdf_generator') & (File.source_id != 'image_generator')
    
    # If a specific source is requested (e.g. 'workspace'), filter by it
    if source and source.lower() not in ("all", "none"):
        return base_filter & (sa_func.lower(File.source) == source.lower())
        
    return base_filter


def _parse_datetime(value: Optional[str], end_of_day: bool = False):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if len(value) == 10:
        parsed = datetime.combine(parsed.date(), time.max if end_of_day else time.min)
    return parsed


def _step_status_case():
    status = func.lower(func.replace(func.replace(func.coalesce(StepMetric.status, ""), "_", " "), "-", " "))
    return case(
        (or_(status.like("%fail%"), status.like("%error%"), status.like("%exception%")), FAILED),
        (
            or_(
                status.like("%success%"),
                status.like("%complete%"),
                status.like("%completed%"),
                status.like("%indexed%"),
                status.like("%comp%"),
            ),
            SUCCESS,
        ),
        else_=IN_PROGRESS,
    )


def _job_status_case():
    status = func.lower(func.replace(func.replace(func.coalesce(Job.job_status, ""), "_", " "), "-", " "))
    return case(
        (or_(status.like("%fail%"), status.like("%error%"), status.like("%exception%")), FAILED),
        (
            or_(
                status.like("%success%"),
                status.like("%complete%"),
                status.like("%completed%"),
                status.like("%indexed%"),
                status.like("%comp%"),
            ),
            SUCCESS,
        ),
        else_=IN_PROGRESS,
    )


def _file_status_counts_subquery():
    normalized = _step_status_case()
    return (
        select(
            StepMetric.file_id.label("file_id"),
            func.sum(case((normalized == FAILED, 1), else_=0)).label("failed_count"),
            func.sum(case((normalized == IN_PROGRESS, 1), else_=0)).label("progress_count"),
            func.count(StepMetric.id).label("step_count"),
        )
        .where(StepMetric.is_deleted == False)
        .group_by(StepMetric.file_id)
        .subquery()
    )


def _derive_file_status(f: File, counts_by_file_id: dict[str, dict[str, int]]) -> str:
    counts = counts_by_file_id.get(str(f.id))
    if counts and counts["step_count"] > 0:
        if counts["failed_count"] > 0:
            return FAILED
        if counts["progress_count"] == 0:
            return SUCCESS
        return IN_PROGRESS

    job_status = normalize_status(f.job.job_status if f.job else None)
    file_status = normalize_status(f.index_status)
    if job_status == FAILED or file_status == FAILED:
        return FAILED
    if job_status == SUCCESS or file_status == SUCCESS:
        return SUCCESS
    return IN_PROGRESS


def _build_file_status_map(session: Session, files: List[File]) -> dict[str, str]:
    file_ids = [f.id for f in files]
    if not file_ids:
        return {}

    normalized = _step_status_case()
    rows = session.exec(
        select(
            StepMetric.file_id,
            func.sum(case((normalized == FAILED, 1), else_=0)),
            func.sum(case((normalized == IN_PROGRESS, 1), else_=0)),
            func.count(StepMetric.id),
        )
        .where(StepMetric.file_id.in_(file_ids), StepMetric.is_deleted == False)
        .group_by(StepMetric.file_id)
    ).all()

    counts_by_file_id = {
        str(file_id): {
            "failed_count": int(failed_count or 0),
            "progress_count": int(progress_count or 0),
            "step_count": int(step_count or 0),
        }
        for file_id, failed_count, progress_count, step_count in rows
    }
    return {str(f.id): _derive_file_status(f, counts_by_file_id) for f in files}


def _apply_file_filters(stmt, status=None, search=None, email=None, file_id=None, start_date=None, end_date=None):
    if search:
        stmt = stmt.where(File.name.ilike(f"%{search}%"))
    if email:
        stmt = stmt.join(User, isouter=False).where(User.email.ilike(f"%{email}%"))
    if file_id:
        stmt = stmt.where(cast(File.id, String).ilike(f"%{file_id}%"))

    start = _parse_datetime(start_date)
    end = _parse_datetime(end_date, end_of_day=True)
    if start:
        stmt = stmt.where(File.updated_at >= start)
    if end:
        stmt = stmt.where(File.updated_at <= end)

    normalized_status = None if not status or status.lower() == "all" else normalize_status(status)
    if normalized_status:
        status_sq = _file_status_counts_subquery()
        job_status = _job_status_case()
        file_status = func.coalesce(
            case(
                (status_sq.c.failed_count > 0, FAILED),
                (status_sq.c.step_count > 0, case((status_sq.c.progress_count == 0, SUCCESS), else_=IN_PROGRESS)),
                (job_status == FAILED, FAILED),
                (job_status == SUCCESS, SUCCESS),
                else_=IN_PROGRESS,
            ),
            IN_PROGRESS,
        )
        stmt = stmt.outerjoin(status_sq, status_sq.c.file_id == File.id).outerjoin(Job, File.job_id == Job.id)
        stmt = stmt.where(file_status == normalized_status)

    return stmt


def get_users(session: Session, limit: int = 1000) -> List[dict]:
    users = session.exec(select(User).order_by(User.created_at.desc()).limit(limit)).all()
    user_ids = [u.id for u in users]
    file_counts = {}
    if user_ids:
        rows = session.exec(
            select(File.user_id, func.count(File.id))
            .where(File.user_id.in_(user_ids), _real_files_filter())
            .group_by(File.user_id)
        ).all()
        file_counts = {str(user_id): count for user_id, count in rows}
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "updated_at": u.updated_at.isoformat() if u.updated_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "is_deleted": u.is_deleted,
            "quota": u.quota,
            "metadata": u.metadata_,
            "file_count": file_counts.get(str(u.id), 0),
        }
        for u in users
    ]


def get_recent_files(
    session: Session,
    skip=0,
    limit=50,
    status=None,
    search=None,
    email=None,
    file_id=None,
    start_date=None,
    end_date=None,
    source=None,
) -> dict:
    base = _apply_file_filters(
        select(File).where(_real_files_filter(source)),
        status,
        search,
        email,
        file_id,
        start_date,
        end_date,
    )
    total = session.exec(select(func.count()).select_from(base.subquery())).one()
    page_files = session.exec(base.order_by(File.updated_at.desc()).offset(skip).limit(limit)).all()
    status_map = _build_file_status_map(session, page_files)

    result = []
    for f in page_files:
        mapped = status_map.get(str(f.id), IN_PROGRESS)
        user_name = user_email = None
        if f.user:
            user_name = f.user.full_name or f.user.username
            user_email = f.user.email

        result.append(
            {
                "file_id": str(f.id),
                "file_name": f.name,
                "user_email": user_email,
                "user_name": user_name,
                "file_type": f.file_type or "Unknown",
                "status": mapped,
                "latest_step": "completed" if mapped == SUCCESS else "indexing",
                "failed_step": "indexing" if mapped == FAILED else None,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
                "job_id": str(f.job_id) if f.job_id else None,
                "id": str(f.id),
            }
        )
    return {"items": result, "total": total}


def _step_to_dict(sm: StepMetric, f: File, user_email: Optional[str], user_name: Optional[str]) -> dict:
    return {
        "id": str(sm.id),
        "file_id": str(f.id),
        "file_name": f.name,
        "job_id": str(sm.job_id) if sm.job_id else str(f.job_id) if f.job_id else None,
        "user_email": user_email,
        "user_name": user_name,
        "file_type": f.file_type or "Unknown",
        "step_name": sm.step or "Unknown Step",
        "status": normalize_status(sm.status),
        "raw_status": sm.status,
        "duration_ms": (sm.duration * 1000) if sm.duration else 0,
        "error_message": None,
        "error_context": None,
        "output_summary": sm.output if isinstance(sm.output, dict) else {},
        "input_payload": sm.input if isinstance(sm.input, dict) else {},
        "output_payload": sm.output if isinstance(sm.output, dict) else {},
        "timing_breakdown": sm.metrics if isinstance(sm.metrics, dict) else {},
        "created_at": sm.created_at.isoformat() if sm.created_at else None,
        "updated_at": sm.updated_at.isoformat() if sm.updated_at else None,
    }


def get_file_details(session: Session, file_id: str) -> List[dict]:
    try:
        f_uuid = uuid.UUID(file_id)
    except ValueError:
        return []

    f = session.exec(select(File).where(File.id == f_uuid, _real_files_filter())).first()
    if not f:
        return []

    user_name = user_email = None
    if f.user:
        user_name = f.user.full_name or f.user.username
        user_email = f.user.email

    step_query = select(StepMetric).where(StepMetric.file_id == f.id, StepMetric.is_deleted == False)
    if f.job_id:
        step_query = step_query.where(or_(StepMetric.job_id == f.job_id, StepMetric.job_id.is_(None)))

    step_rows = session.exec(step_query.order_by(StepMetric.created_at.asc())).all()
    result = [_step_to_dict(sm, f, user_email, user_name) for sm in step_rows]

    if not result:
        result.append(
            {
                "id": str(f.id),
                "file_id": str(f.id),
                "file_name": f.name,
                "job_id": str(f.job_id) if f.job_id else None,
                "user_email": user_email,
                "user_name": user_name,
                "file_type": f.file_type or "Unknown",
                "step_name": "File received",
                "status": normalize_status(f.index_status),
                "raw_status": f.index_status,
                "duration_ms": None,
                "error_message": None,
                "error_context": None,
                "output_summary": {},
                "input_payload": {},
                "output_payload": {},
                "timing_breakdown": {},
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            }
        )
    return result


def get_stats(session: Session, source: str = None):
    real = _real_files_filter(source)
    normalized = _step_status_case()

    total_files = session.exec(select(func.count()).select_from(File).where(real)).one()
    total_jobs = session.exec(
        select(func.count(func.distinct(Job.id))).select_from(Job).join(File, File.job_id == Job.id).where(real)
    ).one()
    active_users = session.exec(select(func.count()).select_from(User).where(User.is_deleted == False)).one()

    status_sq = _file_status_counts_subquery()
    file_status_expr = func.coalesce(
        case(
            (status_sq.c.failed_count > 0, FAILED),
            (status_sq.c.step_count > 0, case((status_sq.c.progress_count == 0, SUCCESS), else_=IN_PROGRESS)),
            (_job_status_case() == FAILED, FAILED),
            (_job_status_case() == SUCCESS, SUCCESS),
            (func.lower(File.index_status) == 'indexed', SUCCESS),
            (func.lower(File.index_status) == 'complete', SUCCESS),
            (func.lower(File.index_status) == 'error', FAILED),
            (func.lower(File.index_status) == 'failed', FAILED),
            else_=IN_PROGRESS,
        ),
        IN_PROGRESS,
    )

    status_rows = session.exec(
        select(file_status_expr.label("status"), func.count(File.id))
        .select_from(File)
        .outerjoin(status_sq, status_sq.c.file_id == File.id)
        .outerjoin(Job, File.job_id == Job.id)
        .where(real)
        .group_by(file_status_expr)
    ).all()
    status_counts = {SUCCESS: 0, FAILED: 0, IN_PROGRESS: 0}
    for status, count in status_rows:
        status_counts[normalize_status(status)] += count

    type_rows = session.exec(select(File.file_type, func.count(File.id)).where(real).group_by(File.file_type)).all()
    files_by_type = {(file_type or "Unknown"): count for file_type, count in type_rows}

    fail_type_rows = session.exec(
        select(File.file_type, func.count(File.id))
        .select_from(File)
        .outerjoin(status_sq, status_sq.c.file_id == File.id)
        .outerjoin(Job, File.job_id == Job.id)
        .where(
            real,
            file_status_expr == FAILED,
        )
        .group_by(File.file_type)
    ).all()
    failures_by_type = {(file_type or "Unknown"): count for file_type, count in fail_type_rows}

    step_perf_rows = session.exec(
        select(StepMetric.step, normalized, func.count(StepMetric.id))
        .join(File, StepMetric.file_id == File.id)
        .where(real, StepMetric.is_deleted == False)
        .group_by(StepMetric.step, normalized)
    ).all()

    pipeline_performance: dict = {}
    for step_name, status, count in step_perf_rows:
        if not step_name:
            continue
        pipeline_performance.setdefault(step_name, {SUCCESS: 0, FAILED: 0, IN_PROGRESS: 0})
        pipeline_performance[step_name][normalize_status(status)] += count

    avg_duration = session.exec(
        select(func.avg(StepMetric.duration))
        .join(File, StepMetric.file_id == File.id)
        .where(real, normalized == SUCCESS, StepMetric.duration > 0)
    ).one()
    # Processing rate calculation (assuming duration is seconds)
    processing_rate = round(3600.0 / avg_duration, 1) if avg_duration and avg_duration > 0 else 0
    success_rate = (status_counts[SUCCESS] / total_files * 100) if total_files else 0.0

    total_steps = session.exec(
        select(func.count(StepMetric.id)).join(File, StepMetric.file_id == File.id).where(real, StepMetric.is_deleted == False)
    ).one()

    return {
        "total_files": total_files,
        "total_jobs": total_jobs,
        "total_steps": total_steps,
        "active_users": active_users,
        "total_success": status_counts[SUCCESS],
        "total_failures": status_counts[FAILED],
        "total_in_progress": status_counts[IN_PROGRESS],
        "success_rate": round(success_rate, 2),
        "processing_rate": processing_rate,
        "files_by_type": files_by_type,
        "failures_by_type": failures_by_type,
        "failures_by_step": {name: counts[FAILED] for name, counts in pipeline_performance.items() if counts[FAILED]},
        "pipeline_performance": pipeline_performance,
    }


def get_jobs(session: Session, skip=0, limit=50, job_id=None) -> dict:
    stmt = select(Job)
    if job_id:
        stmt = stmt.where(cast(Job.id, String).ilike(f"%{job_id}%"))
    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    jobs = session.exec(stmt.order_by(Job.created_at.desc()).offset(skip).limit(limit)).all()

    result = []
    for j in jobs:
        file_obj = j.files[0] if j.files else None
        result.append(
            {
                "id": str(j.id),
                "jobType": j.jobType,
                "job_status": normalize_status(j.job_status),
                "raw_job_status": j.job_status,
                "error_message": j.error_message,
                "created_at": j.created_at.isoformat() if j.created_at else None,
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "finished_at": j.finished_at.isoformat() if j.finished_at else None,
                "is_deleted": j.is_deleted,
                "file_id": str(file_obj.id) if file_obj else None,
            }
        )
    return {"items": result, "total": total}


def get_job_by_id(session: Session, job_id: str) -> Optional[dict]:
    try:
        j_uuid = uuid.UUID(job_id)
    except ValueError:
        return None
    j = session.exec(select(Job).where(Job.id == j_uuid)).first()
    if not j:
        return None
    file_obj = j.files[0] if j.files else None
    return {
        "id": str(j.id),
        "jobType": j.jobType,
        "job_status": normalize_status(j.job_status),
        "raw_job_status": j.job_status,
        "error_message": j.error_message,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "started_at": j.started_at.isoformat() if j.started_at else None,
        "finished_at": j.finished_at.isoformat() if j.finished_at else None,
        "is_deleted": j.is_deleted,
        "file_id": str(file_obj.id) if file_obj else None,
        "input": j.input,
        "output": j.output,
        "metadata": j.metadata_,
    }


def get_step_metrics(session: Session, skip=0, limit=100) -> dict:
    base_query = select(StepMetric).where(or_(StepMetric.is_deleted == False, StepMetric.is_deleted == None))
    total = session.exec(select(func.count(StepMetric.id)).where(or_(StepMetric.is_deleted == False, StepMetric.is_deleted == None))).one()
    metrics = session.exec(base_query.order_by(StepMetric.created_at.desc()).offset(skip).limit(limit)).all()
    return {
        "items": [
            {
                "id": str(m.id),
                "job_id": str(m.job_id) if m.job_id else "",
                "file_id": str(m.file_id) if m.file_id else "",
                "user_id": str(m.user_id) if m.user_id else "",
                "step_name": m.step or "Unknown Step",
                "status": normalize_status(m.status),
                "raw_status": m.status,
                "duration_ms": (m.duration * 1000) if m.duration else 0,
                "error_message": "",
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
            }
            for m in metrics
        ],
        "total": total,
    }


def get_metrics_by_file_id(session: Session, file_id: str) -> List[dict]:
    try:
        f_uuid = uuid.UUID(file_id)
    except ValueError:
        return []
    metrics = session.exec(
        select(StepMetric)
        .where(StepMetric.file_id == f_uuid, or_(StepMetric.is_deleted == False, StepMetric.is_deleted == None))
        .order_by(StepMetric.created_at.asc())
    ).all()
    return [
        {
            "id": str(m.id),
            "job_id": str(m.job_id) if m.job_id else "",
            "file_id": str(m.file_id) if m.file_id else "",
            "user_id": str(m.user_id) if m.user_id else "",
            "step_name": m.step or "Unknown Step",
            "status": normalize_status(m.status),
            "raw_status": m.status,
            "duration_ms": (m.duration * 1000) if m.duration else 0,
            "error_message": "",
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        }
        for m in metrics
    ]


def get_step_metrics_by_type(session: Session) -> dict:
    normalized = _step_status_case()
    rows = session.exec(
        select(StepMetric.step, normalized, func.count(StepMetric.id))
        .where(StepMetric.is_deleted == False)
        .group_by(StepMetric.step, normalized)
    ).all()

    result = {}
    for step_name, status, count in rows:
        if not step_name:
            continue
        result.setdefault(step_name, {SUCCESS: 0, FAILED: 0, IN_PROGRESS: 0})
        result[step_name][normalize_status(status)] += count
    return result
