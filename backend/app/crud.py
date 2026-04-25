from typing import List
import uuid

from sqlalchemy import func
from sqlmodel import Session, select

from .models import File, Job, StepMetric, User


# ---------------- USERS ----------------
def get_users(session: Session) -> List[dict]:
    users = session.exec(select(User)).all()

    results = []
    for u in users:
        file_count = session.exec(
            select(func.count())
            .select_from(File)
            .where(File.user_id == u.id)
        ).one()

        results.append({
            "id": str(u.id),
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "is_deleted": u.is_deleted,
            "quota": u.quota or {},
            "metadata": u.metadata or {},
            "file_count": file_count,
        })

    return results


# ---------------- FILES ----------------
def get_recent_files(session: Session, skip=0, limit=100):

    base_query = (
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
        .where(func.lower(func.trim(File.source)) != "system")
        .where(File.is_deleted == False)
        .group_by(File.name)
    )

    total = len(session.exec(base_query).all())

    rows = session.exec(
        base_query
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
        "total": total,
    }


# ---------------- STEP METRICS ----------------
def get_step_metrics(session: Session, skip=0, limit=100):

    total = session.exec(
        select(func.count()).select_from(StepMetric)
    ).one()

    metrics = session.exec(
        select(StepMetric)
        .order_by(StepMetric.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

    return {
        "items": [
            {
                "id": str(m.id),
                "job_id": str(m.job_id),
                "file_id": str(m.file_id) if m.file_id else None,
                "step_name": m.step,
                "status": (
                    "failed" if m.status.lower() in ["fail", "failed", "error"]
                    else "success" if m.status.lower() in ["success", "complete"]
                    else "in_progress"
                ),
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
    if not file:
        return []

    metrics = session.exec(
        select(StepMetric).where(StepMetric.job_id == file.job_id)
    ).all()

    return [
        {
            "step_name": m.step,
            "status": m.status,
            "duration_ms": m.duration,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in metrics
    ]


# ---------------- JOBS ----------------
def get_jobs(session: Session, skip=0, limit=50):

    total = session.exec(
        select(func.count()).select_from(Job)
    ).one()

    jobs = session.exec(
        select(Job)
        .order_by(Job.created_at.desc())
        .offset(skip)
        .limit(limit)
    ).all()

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


# ---------------- STATS ----------------
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
        .where(func.lower(func.trim(File.source)) != "system")
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
        "pipeline_performance": {},
    }