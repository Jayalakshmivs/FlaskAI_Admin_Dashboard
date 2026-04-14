from typing import List
from sqlmodel import Session, select, func
from sqlalchemy import or_
from .models import User, File, Job, StepMetric
import uuid
from collections import defaultdict

# ── Real files filter: source=system AND source_id != pdf_generator ──────────
def _real_files_filter():
    return (File.source == 'system') & (File.source_id != 'pdf_generator')

# ── Status helpers ────────────────────────────────────────────────────────────
def _step_status_label(raw: str) -> str:
    if not raw: return "in progress"
    s = raw.lower()
    if any(k in s for k in ('complete', 'success', 'indexed', 'comp')): return "success"
    if any(k in s for k in ('error', 'fail', 'failed')): return "failed"
    return "in progress"

def _derive_file_status(statuses: list) -> str:
    """Any step fails → failed. All complete → success. Otherwise → in progress."""
    if not statuses: return "in progress"
    low = [(s or "").lower() for s in statuses]
    if any(any(k in s for k in ('error', 'fail')) for s in low): return "failed"
    if all(any(k in s for k in ('complete', 'success', 'indexed')) for s in low): return "success"
    return "in progress"

def _build_job_status_map(session: Session, job_ids: list) -> dict:
    if not job_ids: return {}
    rows = session.exec(
        select(StepMetric.job_id, StepMetric.status).where(StepMetric.job_id.in_(job_ids))
    ).all()
    job_steps = defaultdict(list)
    for jid, st in rows:
        if jid: job_steps[str(jid)].append(st)
    return {jid: _derive_file_status(sts) for jid, sts in job_steps.items()}

def _error_jobs_sq():
    return (select(StepMetric.job_id)
        .where(or_(StepMetric.status.ilike('%error%'), StepMetric.status.ilike('%fail%'), StepMetric.status.ilike('fail')))
        .distinct().scalar_subquery())

def _has_steps_sq():
    return select(StepMetric.job_id).distinct().scalar_subquery()

# ── Users ─────────────────────────────────────────────────────────────────────
def get_users(session: Session, limit: int = 100) -> List[dict]:
    users = session.exec(select(User).order_by(User.created_at.desc())).all()
    return [{
        "id": str(u.id), "email": u.email, "username": u.username,
        "full_name": u.full_name,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
        "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
        "is_deleted": u.is_deleted, "quota": u.quota, "metadata": u.metadata_,
    } for u in users][:limit]

# ── Files ─────────────────────────────────────────────────────────────────────
def _build_complete_jobs_sq():
    """Subquery: job_ids where ALL steps are complete/success"""
    return (
        select(StepMetric.job_id)
        .group_by(StepMetric.job_id)
        .having(
            func.sum(
                func.case(
                    (or_(StepMetric.status.ilike('%complete%'), StepMetric.status.ilike('%success%'),
                         StepMetric.status.ilike('%indexed%'), StepMetric.status.ilike('comp')), 1),
                    else_=0
                )
            ) == func.count(StepMetric.id)
        ).distinct().scalar_subquery()
    )

def _apply_file_filters(stmt, status=None, search=None, email=None,
                        file_id=None, start_date=None, end_date=None):
    from sqlalchemy import String, cast
    if status and status != "All":
        eq = _error_jobs_sq(); hs = _has_steps_sq(); all_complete = _build_complete_jobs_sq()
        if status == "failed":
            stmt = stmt.where(File.job_id.in_(eq))
        elif status == "success":
            stmt = stmt.where(File.job_id.in_(all_complete))
        elif status == "in progress":
            stmt = stmt.where((File.job_id.in_(hs) & ~File.job_id.in_(all_complete)) | ~File.job_id.in_(hs) | File.job_id.is_(None))
    if search: stmt = stmt.where(File.name.ilike(f"%{search}%"))
    if email: stmt = stmt.join(User, isouter=False).where(User.email.ilike(f"%{email}%"))
    if file_id:
        stmt = stmt.where(cast(File.id, String).ilike(f"%{file_id}%"))
    if start_date: stmt = stmt.where(File.updated_at >= start_date)
    if end_date: stmt = stmt.where(File.updated_at <= end_date)
    return stmt

def get_recent_files(session: Session, skip=0, limit=50, status=None,
                     search=None, email=None, file_id=None,
                     start_date=None, end_date=None) -> dict:
    base = _apply_file_filters(
        select(File).where(_real_files_filter()),
        status, search, email, file_id, start_date, end_date
    )
    total = session.exec(select(func.count()).select_from(base.subquery())).one()
    page_files = session.exec(base.order_by(File.updated_at.desc()).offset(skip).limit(limit)).all()

    job_ids = [f.job_id for f in page_files if f.job_id]
    job_status_map = _build_job_status_map(session, job_ids)

    result = []
    for f in page_files:
        jid = str(f.job_id) if f.job_id else None
        mapped = job_status_map.get(jid, "in progress") if jid else "in progress"
        user_name = user_email = None
        if f.user:
            user_name = f.user.full_name or f.user.username
            user_email = f.user.email
        result.append({
            "file_id": str(f.id), "file_name": f.name,
            "user_email": user_email, "user_name": user_name,
            "file_type": f.file_type or "Unknown", "status": mapped,
            "latest_step": "indexing" if mapped == "in progress" else "completed",
            "failed_step": "indexing" if mapped == "failed" else None,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            "job_id": jid, "id": str(f.id),
        })
    return {"items": result, "total": total}

def get_file_details(session: Session, file_id: str) -> List[dict]:
    try: f_uuid = uuid.UUID(file_id)
    except ValueError: return []
    f = session.exec(select(File).where(File.id == f_uuid)).first()
    if not f: return []
    user_name = user_email = None
    if f.user:
        user_name = f.user.full_name or f.user.username
        user_email = f.user.email
    result = []
    if f.job_id:
        step_rows = session.exec(
            select(StepMetric).where(StepMetric.job_id == f.job_id)
            .order_by(StepMetric.created_at.asc())
        ).all()
        for sm in step_rows:
            result.append({
                "id": str(sm.id), "file_id": str(f.id), "file_name": f.name,
                "user_email": user_email, "user_name": user_name,
                "file_type": f.file_type or "Unknown",
                "step_name": sm.step or "Unknown Step",
                "status": _step_status_label(sm.status),
                "raw_status": sm.status, "duration_ms": sm.duration,
                "error_message": None, "error_context": None,
                "output_summary": sm.output if isinstance(sm.output, dict) else {},
                "input_payload": sm.input if isinstance(sm.input, dict) else {},
                "output_payload": sm.output if isinstance(sm.output, dict) else {},
                "timing_breakdown": {},
                "created_at": sm.created_at.isoformat() if sm.created_at else None,
                "updated_at": sm.updated_at.isoformat() if sm.updated_at else None,
            })
    if not result:
        result.append({
            "id": str(f.id), "file_id": str(f.id), "file_name": f.name,
            "user_email": user_email, "user_name": user_name,
            "file_type": f.file_type or "Unknown", "step_name": "indexing",
            "status": "in progress", "raw_status": f.index_status,
            "duration_ms": None, "error_message": None, "error_context": None,
            "output_summary": {}, "input_payload": {}, "output_payload": {},
            "timing_breakdown": {},
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        })
    return result

# ── Stats ─────────────────────────────────────────────────────────────────────
def get_stats(session: Session):
    real = _real_files_filter()
    eq = _error_jobs_sq()
    hs = _has_steps_sq()

    total_files = session.exec(select(func.count()).select_from(File).where(real)).one()
    total_jobs = session.exec(
        select(func.count()).select_from(Job).join(File, File.job_id == Job.id).where(real)
    ).one()
    active_users = session.exec(
        select(func.count()).select_from(User).where(User.is_deleted == False)
    ).one()
    total_failures = session.exec(
        select(func.count()).select_from(File).where(real, File.job_id.in_(eq))
    ).one()
    total_success = session.exec(
        select(func.count()).select_from(File).where(real, File.job_id.in_(hs), File.job_id.not_in(eq))
    ).one()
    total_in_progress = total_files - total_success - total_failures

    type_rows = session.exec(
        select(File.file_type, func.count(File.id)).where(real).group_by(File.file_type)
    ).all()
    files_by_type = {(r[0] or "Unknown"): r[1] for r in type_rows}

    fail_type_rows = session.exec(
        select(File.file_type, func.count(File.id)).where(real, File.job_id.in_(eq)).group_by(File.file_type)
    ).all()
    failures_by_type = {(r[0] or "Unknown"): r[1] for r in fail_type_rows}

    success_rate = (float(total_success) / float(total_files) * 100) if total_files > 0 else 0.0

    # Query pipeline performance for real files only
    # Get real file IDs first
    real_files_result = session.exec(
        select(File.id).where(_real_files_filter())
    ).all()
    real_file_ids_list = [f for f in real_files_result]
    
    if real_file_ids_list:
        step_perf_rows = session.exec(
            select(StepMetric.step, StepMetric.status, func.count(StepMetric.id))
            .where(StepMetric.file_id.in_(real_file_ids_list))
            .group_by(StepMetric.step, StepMetric.status)
        ).all()
    else:
        step_perf_rows = []
    
    pipeline_performance: dict = {}
    for step_name, status, count in step_perf_rows:
        if not step_name: 
            continue
        if step_name not in pipeline_performance:
            pipeline_performance[step_name] = {"complete": 0, "error": 0}
        
        # Direct mapping for common statuses
        if status and status.lower() in ('comp', 'complete', 'success', 'indexed'):
            pipeline_performance[step_name]["complete"] += count
        elif status and status.lower() in ('fail', 'error', 'failed'):
            pipeline_performance[step_name]["error"] += count
        # else: in_progress statuses ('prog') are not counted

    avg_duration = session.exec(
        select(func.avg(StepMetric.duration)).where(
            StepMetric.status.ilike('%comp%')
        )
    ).one()
    processing_rate = round(3600.0 / avg_duration, 1) if avg_duration and avg_duration > 0 else 0

    # Ensure no values are 0 if data exists
    total_in_progress = max(0, total_in_progress)

    return {
        "total_files": total_files, "total_jobs": total_jobs,
        "active_users": active_users, "total_success": total_success,
        "total_failures": total_failures, "total_in_progress": total_in_progress,
        "success_rate": round(success_rate, 2), "processing_rate": processing_rate,
        "files_by_type": files_by_type or {"Unknown": 0},
        "failures_by_type": failures_by_type or {"Unknown": 0},
        "failures_by_step": {"indexing": total_failures},
        "pipeline_performance": pipeline_performance,
    }

# ── Jobs ──────────────────────────────────────────────────────────────────────
def get_jobs(session: Session, skip=0, limit=50, job_id=None) -> dict:
    from sqlalchemy import String, cast
    stmt = select(Job)
    if job_id: stmt = stmt.where(cast(Job.id, String).ilike(f"%{job_id}%"))
    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    jobs = session.exec(stmt.order_by(Job.created_at.desc()).offset(skip).limit(limit)).all()
    result = []
    for j in jobs:
        f_id = str(j.files[0].id) if j.files else None
        result.append({
            "id": str(j.id), "jobType": j.jobType, "job_status": j.job_status,
            "error_message": j.error_message,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "finished_at": j.finished_at.isoformat() if j.finished_at else None,
            "is_deleted": j.is_deleted, "file_id": f_id,
        })
    return {"items": result, "total": total}

def get_job_by_id(session: Session, job_id: str) -> dict:
    try: j_uuid = uuid.UUID(job_id)
    except ValueError: return None
    j = session.exec(select(Job).where(Job.id == j_uuid)).first()
    if not j: return None
    f_id = str(j.files[0].id) if j.files else None
    return {
        "id": str(j.id), "jobType": j.jobType, "job_status": j.job_status,
        "error_message": j.error_message,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "started_at": j.started_at.isoformat() if j.started_at else None,
        "finished_at": j.finished_at.isoformat() if j.finished_at else None,
        "is_deleted": j.is_deleted, "file_id": f_id,
        "input": j.input, "output": j.output, "metadata": j.metadata_,
    }

# ── Step Metrics — all 31k rows ───────────────────────────────────────────────
def get_step_metrics(session: Session, skip=0, limit=100) -> dict:
    base = select(StepMetric)
    total = session.exec(select(func.count()).select_from(base.subquery())).one()
    metrics = session.exec(base.order_by(StepMetric.created_at.desc()).offset(skip).limit(limit)).all()
    return {
        "items": [{
            "id": str(m.id), "job_id": str(m.job_id) if m.job_id else "",
            "step_name": m.step or "—", "status": m.status or "—",
            "duration_ms": m.duration, "error_message": "",
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        } for m in metrics],
        "total": total
    }

def get_metrics_by_file_id(session: Session, file_id: str) -> List[dict]:
    try: f_uuid = uuid.UUID(file_id)
    except ValueError: return []
    f = session.exec(select(File).where(File.id == f_uuid)).first()
    if not f or not f.job_id: return []
    metrics = session.exec(
        select(StepMetric).where(StepMetric.job_id == f.job_id).order_by(StepMetric.created_at.asc())
    ).all()
    return [{
        "id": str(m.id), "job_id": str(m.job_id) if m.job_id else "",
        "step_name": m.step or "—", "status": m.status or "—",
        "duration_ms": m.duration, "error_message": "",
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "updated_at": m.updated_at.isoformat() if m.updated_at else None,
    } for m in metrics]

# ── Step Metrics by Type (Pipeline Performance) ───────────────────────────────
def get_step_metrics_by_type(session: Session) -> dict:
    """Aggregate step metrics by step type and status (success, failed, in_progress)."""
    step_data_rows = session.exec(
        select(StepMetric.step, StepMetric.status, func.count(StepMetric.id))
        .group_by(StepMetric.step, StepMetric.status)
    ).all()
    
    result = {}
    for step_name, status, count in step_data_rows:
        if not step_name:
            continue
        
        if step_name not in result:
            result[step_name] = {"success": 0, "failed": 0, "in_progress": 0}
        
        # Normalize status to one of: success, failed, in_progress
        normalized_status = _step_status_label(status)
        
        if normalized_status == "success":
            result[step_name]["success"] += count
        elif normalized_status == "failed":
            result[step_name]["failed"] += count
        else:
            result[step_name]["in_progress"] += count
    
    return result
