"""
Auto-seed sample data on first startup if tables are empty.
Runs inside the backend container — no external SQL files needed.
"""
import uuid
import logging
from datetime import datetime, timedelta
import random

from sqlmodel import Session, select, func
from sqlalchemy import text

logger = logging.getLogger(__name__)


def should_seed(session: Session) -> bool:
    """Only seed if users table is empty."""
    try:
        count = session.exec(select(func.count()).select_from(text("users"))).one()
        return count == 0
    except Exception:
        return True


def seed_database(session: Session):
    """Insert sample data for the dashboard."""
    try:
        if not should_seed(session):
            logger.info("✅ Database already has data — skipping seed.")
            return

        logger.info("🌱 Seeding sample data...")

        now = datetime.utcnow()

        # ── 1. Users ──────────────────────────────────────────────────────────
        user_ids = [uuid.uuid4() for _ in range(5)]
        emails = [
            "jayalakshmivs24@gmail.com",
            "admin@flaskai.com",
            "analyst@flaskai.com",
            "devops@flaskai.com",
            "viewer@flaskai.com",
        ]
        names = ["Jayalakshmi VS", "Admin User", "Data Analyst", "DevOps Engineer", "Viewer"]

        for i, uid in enumerate(user_ids):
            session.exec(
                text("""
                    INSERT INTO users
                        (id, provider_id, username, email, full_name,
                         created_at, updated_at, is_deleted)
                    VALUES
                        (:id, :pid, :username, :email, :full_name,
                         :created_at, :updated_at, false)
                    ON CONFLICT (email) DO NOTHING
                """),
                {
                    "id": str(uid),
                    "pid": str(uuid.uuid4()),
                    "username": names[i].lower().replace(" ", "_"),
                    "email": emails[i],
                    "full_name": names[i],
                    "created_at": now - timedelta(days=random.randint(1, 90)),
                    "updated_at": now,
                },
            )

        # ── 2. Jobs ───────────────────────────────────────────────────────────
        statuses = ["Success", "Failed", "In Progress", "Success", "Success",
                    "Failed", "Success", "In Progress", "Success", "Failed"]
        job_ids = [uuid.uuid4() for _ in range(10)]

        for i, jid in enumerate(job_ids):
            session.exec(
                text("""
                    INSERT INTO jobs
                        (id, "jobType", job_status, created_at, updated_at,
                         started_at, finished_at, is_deleted)
                    VALUES
                        (:id, :jtype, :status, :created_at, :updated_at,
                         :started_at, :finished_at, false)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id": str(jid),
                    "jtype": random.choice(["indexing", "pdf_processing", "ocr", "classification"]),
                    "status": statuses[i % len(statuses)],
                    "created_at": now - timedelta(days=random.randint(1, 30)),
                    "updated_at": now,
                    "started_at": now - timedelta(hours=random.randint(1, 48)),
                    "finished_at": now - timedelta(minutes=random.randint(5, 120))
                    if statuses[i % len(statuses)] != "In Progress" else None,
                },
            )

        # ── 3. Files ──────────────────────────────────────────────────────────
        file_names = [
            "annual_report_2024.pdf", "q4_financials.pdf", "employee_handbook.docx",
            "product_spec_v2.pdf", "legal_contract_001.pdf", "research_paper.pdf",
            "tax_filing_2023.pdf", "compliance_doc.pdf", "training_manual.pdf",
            "market_analysis.pdf", "budget_forecast.xlsx", "audit_report.pdf",
            "customer_data.csv", "vendor_agreement.pdf", "project_plan.docx",
            "security_policy.pdf", "onboarding_checklist.pdf", "release_notes.md",
            "api_documentation.pdf", "meeting_minutes.docx",
        ]

        file_statuses = ["Success", "Success", "Failed", "Success", "In Progress",
                         "Success", "Failed", "Success", "Success", "In Progress",
                         "Success", "Failed", "Success", "Success", "In Progress",
                         "Success", "Success", "Failed", "Success", "Success"]

        file_ids = [uuid.uuid4() for _ in range(len(file_names))]

        for i, fid in enumerate(file_ids):
            session.exec(
                text("""
                    INSERT INTO files
                        (id, name, file_type, source, source_id,
                         destination_address, uploaded_at, is_deleted,
                         job_id, user_id, index_status, "indexVersion",
                         created_at, updated_at)
                    VALUES
                        (:id, :name, :ftype, :source, :source_id,
                         :dest, :uploaded_at, false,
                         :job_id, :user_id, :index_status, :index_version,
                         :created_at, :updated_at)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id": str(fid),
                    "name": file_names[i],
                    "ftype": file_names[i].rsplit(".", 1)[-1].upper(),
                    "source": "upload",
                    "source_id": str(uuid.uuid4()),
                    "dest": f"s3://flaskai-bucket/files/{file_names[i]}",
                    "uploaded_at": now - timedelta(days=random.randint(1, 60)),
                    "job_id": str(job_ids[i % len(job_ids)]),
                    "user_id": str(user_ids[i % len(user_ids)]),
                    "index_status": file_statuses[i],
                    "index_version": "v1.0",
                    "created_at": now - timedelta(days=random.randint(1, 60)),
                    "updated_at": now,
                },
            )

        # ── 4. Step Metrics ───────────────────────────────────────────────────
        step_names = [
            "text_extraction", "ocr_processing", "classification",
            "embedding_generation", "indexing", "validation", "pdf_splitting",
        ]
        step_statuses = ["Success", "Success", "Failed", "Success", "In Progress", "Success", "Failed"]

        for i, fid in enumerate(file_ids):
            jid = job_ids[i % len(job_ids)]
            for j, step in enumerate(step_names):
                duration = random.randint(200, 15000)
                s = step_statuses[(i + j) % len(step_statuses)]
                session.exec(
                    text("""
                        INSERT INTO step_metrics
                            (id, step, status, duration, file_id, job_id,
                             user_id, created_at, updated_at, is_deleted)
                        VALUES
                            (:id, :step, :status, :duration, :file_id, :job_id,
                             :user_id, :created_at, :updated_at, false)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "step": step,
                        "status": s,
                        "duration": duration,
                        "file_id": str(fid),
                        "job_id": str(jid),
                        "user_id": str(user_ids[i % len(user_ids)]),
                        "created_at": now - timedelta(days=random.randint(0, 30),
                                                      minutes=random.randint(0, 1440)),
                        "updated_at": now,
                    },
                )

        session.commit()
        logger.info("✅ Sample data seeded successfully — 5 users, 10 jobs, 20 files, 140 step metrics.")

    except Exception as e:
        session.rollback()
        logger.error(f"❌ Seed failed: {e}")
