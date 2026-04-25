from typing import List
import uuid

from sqlalchemy import func
from sqlmodel import Session, select

from .models import File, Job, StepMetric, User


SUCCESS = "success"
FAILED = "failed"
IN_PROGRESS = "in progress"


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
            "updated_at": u.updated_at.isoformat() if u.updated_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "is_deleted": u.is_deleted,
            "quota": u.quota,
            "metadata": u.metadata_,
        }
        for u in users
    ]


# ---------------- FILES (FINAL FIXED) ----------------
def get_recent_files(session: Session, skip=0, limit=200, **kwargs):
    base_stmt = (
        select(File.id)
        .join(Job, File.job_id == Job.id)
        .join(StepMetric, StepMetric.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) == "system")
        .where(File.is_deleted == False)
        .group_by(File.id)
    )

    total = session.exec(
        select(func.count()).select_from(base_stmt.subquery())
    ).one()

    stmt = (
        select(File)
        .join(Job, File.job_id == Job.id)
        .join(StepMetric, StepMetric.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) == "system")
        .where(File.is_deleted == False)
        .group_by(File.id)
        .order_by(File.created_at.desc())
    )

    files = session.exec(stmt.offset(skip).limit(limit)).all()

    return {
        "items": [
            {
                "file_id": str(f.id),
                "file_name": f.name,
                "file_type": f.file_type,
                "status": f.index_status,
                "created_at": f.created_at.isoformat() if f.created_at else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            }
            for f in files
        ],
        "total": total,
    }


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
                "started_at": j.started_at.isoformat() if j.started_at else None,
                "finished_at": j.finished_at.isoformat() if j.finished_at else None,
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
                "job_id": str(m.job_id) if m.job_id else "",
                "file_id": str(m.file_id) if m.file_id else "",
                "step_name": m.step,
                "status": m.status,
                "duration_ms": m.duration,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in metrics
        ],
        "total": total,
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


# ---------------- STATS (FINAL FIXED) ----------------
def get_stats(session: Session):
    print("📊 Calculating dashboard stats...")

    base_stmt = (
        select(File.id)
        .join(Job, File.job_id == Job.id)
        .join(StepMetric, StepMetric.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) == "system")
        .group_by(File.id)
    )

    total_files = session.exec(
        select(func.count()).select_from(base_stmt.subquery())
    ).one()

    metrics = session.exec(
        select(StepMetric)
        .join(Job, StepMetric.job_id == Job.id)
        .join(File, File.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) == "system")
    ).all()

    total_metrics = len(metrics)

    success = sum(1 for m in metrics if m.status in ["success", "comp", "completed"])
    failed = sum(1 for m in metrics if m.status in ["failed", "fail", "error"])
    in_progress = sum(1 for m in metrics if m.status in ["in progress", "prog", "processing"])

    success_rate = (success / total_metrics * 100) if total_metrics else 0

    total_jobs = session.exec(select(func.count()).select_from(Job)).one()
    total_users = session.exec(select(func.count()).select_from(User)).one()

    return {
        "total_files": total_files,
        "total_jobs": total_jobs,
        "active_users": total_users,
        "total_success": success,
        "total_failures": failed,
        "total_in_progress": in_progress,
        "success_rate": round(success_rate, 2),
        "processing_rate": 0,
        "files_by_type": {},
        "failures_by_type": {},
        "failures_by_step": {},
        "pipeline_performance": {},
    }


# ---------------- STEP METRICS BY TYPE ----------------
def get_step_metrics_by_type(session: Session):
    rows = session.exec(
        select(StepMetric.step, func.count(StepMetric.id))
        .group_by(StepMetric.step)
    ).all()

    return {
        step: {"success": count, "failed": 0, "in_progress": 0}
        for step, count in rows
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
