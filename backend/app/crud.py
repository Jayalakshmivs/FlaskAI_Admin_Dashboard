from typing import List
import uuid

from sqlalchemy import func
from sqlmodel import Session, select

from .models import File, Job, StepMetric, User


# ---------------- USERS ----------------
def get_users(session: Session) -> List[dict]:
    users = session.exec(select(User)).all()

    return [
        {
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


# ---------------- FILES (NON-SYSTEM CLEAN) ----------------
def get_recent_files(session: Session, skip=0, limit=200, **kwargs):
    rows = session.exec(
        select(
            File.name,
            func.max(File.created_at).label("created_at"),
            func.bool_or(
                func.lower(StepMetric.status).in_(["failed", "fail", "error"])
            ).label("has_failed"),
            func.bool_and(
                func.lower(StepMetric.status).in_(["success", "completed", "complete"])
            ).label("all_success")
        )
        .join(Job, File.job_id == Job.id)
        .join(StepMetric, StepMetric.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) != "system")   # ✅ NON-SYSTEM FILTER
        .where(File.is_deleted == False)
        .group_by(File.name)
        .order_by(func.max(File.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all()

    items = []
    for r in rows:
        if r.has_failed:
            status = "failed"
        elif r.all_success:
            status = "success"
        else:
            status = "in_progress"

        items.append({
            "file_name": r.name,
            "status": status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "items": items,
        "total": len(rows),
    }


# ---------------- FILE DETAILS ----------------
def get_file_details(session: Session, file_id: str):
    try:
        f_uuid = uuid.UUID(file_id)
    except:
        return []

    file = session.get(File, f_uuid)
    if not file or not file.job_id:
        return []

    steps = session.exec(
        select(StepMetric).where(StepMetric.job_id == file.job_id)
    ).all()

    return [
        {
            "step_name": s.step,
            "status": s.status,
            "duration": s.duration,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in steps
    ]


# ---------------- METRICS BY FILE ----------------
def get_metrics_by_file_id(session: Session, file_id: str):
    try:
        f_uuid = uuid.UUID(file_id)
    except:
        return []

    file = session.get(File, f_uuid)
    if not file or not file.job_id:
        return []

    metrics = session.exec(
        select(StepMetric).where(StepMetric.job_id == file.job_id)
    ).all()

    return [
        {
            "step_name": m.step,
            "status": m.status,
            "duration": m.duration,
        }
        for m in metrics
    ]


# ---------------- JOBS ----------------
def get_jobs(session: Session, skip=0, limit=50, job_id=None):
    stmt = select(Job)

    if job_id:
        stmt = stmt.where(Job.id == job_id)

    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    jobs = session.exec(stmt.offset(skip).limit(limit)).all()

    return {
        "items": [
            {
                "id": str(j.id),
                "jobType": j.jobType,
                "job_status": j.job_status,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
        "total": total,
    }


# ---------------- STEP METRICS ----------------
def get_step_metrics(session: Session, skip=0, limit=100):
    stmt = select(StepMetric)

    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    metrics = session.exec(stmt.offset(skip).limit(limit)).all()

    return {
        "items": [
            {
                "id": str(m.id),
                "job_id": str(m.job_id),
                "step_name": m.step,
                "status": m.status,
            }
            for m in metrics
        ],
        "total": total,
    }


# ---------------- STATS (NON-SYSTEM CLEAN) ----------------
def get_stats(session: Session):
    rows = session.exec(
        select(
            File.name,
            func.bool_or(
                func.lower(StepMetric.status).in_(["failed", "fail", "error"])
            ).label("has_failed"),
            func.bool_and(
                func.lower(StepMetric.status).in_(["success", "completed", "complete"])
            ).label("all_success")
        )
        .join(Job, File.job_id == Job.id)
        .join(StepMetric, StepMetric.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) != "system")   # ✅ NON-SYSTEM FILTER
        .where(File.is_deleted == False)
        .group_by(File.name)
    ).all()

    total_files = len(rows)

    success = sum(1 for r in rows if r.all_success)
    failed = sum(1 for r in rows if r.has_failed)
    in_progress = total_files - success - failed

    total_jobs = session.exec(select(func.count()).select_from(Job)).one()
    total_users = session.exec(select(func.count()).select_from(User)).one()

    return {
        "total_files": total_files,
        "total_jobs": total_jobs,
        "active_users": total_users,
        "total_success": success,
        "total_failures": failed,
        "total_in_progress": in_progress,
        "success_rate": round((success / total_files) * 100, 2) if total_files else 0,
        "processing_rate": 0,
        "files_by_type": {},
        "failures_by_type": {},
        "failures_by_step": {},
        "pipeline_performance": {}
    }


# ---------------- JOB DETAILS ----------------
def get_job_by_id(session: Session, job_id: str):
    try:
        j_uuid = uuid.UUID(job_id)
    except:
        return None

    job = session.get(Job, j_uuid)
    if not job:
        return None

    return {
        "id": str(job.id),
        "status": job.job_status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }
