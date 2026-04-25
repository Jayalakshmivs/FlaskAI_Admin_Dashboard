from typing import List
import uuid

from sqlalchemy import func
from sqlmodel import Session, select

from .models import File, Job, StepMetric, User


# ---------------- STATUS DERIVATION ----------------
def derive_status(job_status: str, step_statuses: list):
    js = (job_status or "").lower().replace("-", "_").strip()

    # Rule 1: if ANY step failed → failed
    for s in step_statuses:
        if s and s.lower() in ["failed", "fail", "error"]:
            return "failed"

    # Rule 2: job complete → success
    if js == "complete":
        return "success"

    # Rule 3: otherwise
    return "in_progress"


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


# ---------------- FILES (FINAL) ----------------
def get_recent_files(session: Session, skip=0, limit=200, **kwargs):
    subquery = (
        select(File.id)
        .join(Job, File.job_id == Job.id)
        .join(StepMetric, StepMetric.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) == "system")
        .where(func.lower(Job.job_status) == "complete")
        .where(File.is_deleted == False)
        .distinct()
        .subquery()
    )

    total = session.exec(
        select(func.count()).select_from(subquery)
    ).one()

    stmt = (
        select(File)
        .where(File.id.in_(select(subquery.c.id)))
        .order_by(File.created_at.desc())
    )

    files = session.exec(stmt.offset(skip).limit(limit)).all()

    items = []
    for f in files:
        job = session.get(Job, f.job_id) if f.job_id else None

        step_statuses = session.exec(
            select(StepMetric.status).where(StepMetric.job_id == f.job_id)
        ).all()

        items.append({
            "file_id": str(f.id),
            "file_name": f.name,
            "file_type": f.file_type,
            "status": derive_status(
                job.job_status if job else None,
                step_statuses
            ),
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        })

    return {
        "items": items,
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


# ---------------- STATS (FINAL) ----------------
def get_stats(session: Session):
    subquery = (
        select(File.id)
        .join(Job, File.job_id == Job.id)
        .join(StepMetric, StepMetric.job_id == Job.id)
        .where(func.lower(func.trim(File.source)) == "system")
        .where(func.lower(Job.job_status) == "complete")
        .distinct()
        .subquery()
    )

    files = session.exec(
        select(File).where(File.id.in_(select(subquery.c.id)))
    ).all()

    total_files = len(files)

    success = 0
    failed = 0
    in_progress = 0

    for f in files:
        job = session.get(Job, f.job_id) if f.job_id else None

        step_statuses = session.exec(
            select(StepMetric.status).where(StepMetric.job_id == f.job_id)
        ).all()

        status = derive_status(
            job.job_status if job else None,
            step_statuses
        )

        if status == "success":
            success += 1
        elif status == "failed":
            failed += 1
        else:
            in_progress += 1

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
