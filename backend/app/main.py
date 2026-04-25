from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select
from typing import List

from . import crud
from .models import File, Job, StepMetric, User

import os
from dotenv import load_dotenv
import time
import uuid
from datetime import datetime
from sqlalchemy.exc import OperationalError

load_dotenv()

# -------------------- DATABASE --------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dashboard.db")


def create_engine_with_retry(url, max_retries=5, delay=5):
    db_type = "PostgreSQL" if url.startswith("postgresql") else "SQLite"
    print(f"🚀 Initializing {db_type} database...")
    print(f"🔗 URL: {url.split('@')[-1] if '@' in url else url}")

    for i in range(max_retries):
        try:
            connect_args = {}
            if url.startswith("sqlite"):
                connect_args = {"check_same_thread": False}

            engine = create_engine(url, connect_args=connect_args)

            with engine.connect():
                print(f"✅ {db_type} Database connected successfully")
                return engine

        except OperationalError as e:
            print(f"❌ Attempt {i+1}/{max_retries} failed: {str(e)}")
            if i == max_retries - 1:
                raise
            time.sleep(delay)


engine = create_engine_with_retry(DATABASE_URL)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    print("🛠️ Creating tables if they don't exist...")
    SQLModel.metadata.create_all(engine)
    print("✅ Tables initialized")


# -------------------- APP --------------------

app = FastAPI(title="AI Processing Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------- STARTUP --------------------

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    seed_database()


# -------------------- FIXED SEED --------------------

def seed_database():
    """
    Safe seeding: only runs if DB is empty.
    Uses correct relationships (job_id).
    """
    with Session(engine) as session:

        # Check existing data
        if session.exec(select(File)).first():
            print("✅ Database already has data. Skipping seed.")
            return

        print("🌱 Seeding initial data...")

        # ---- USER ----
        user = User(
            id=uuid.uuid4(),
            provider_id=uuid.uuid4(),
            email="admin@example.com",
            username="admin",
            full_name="System Admin",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        # ---- FILE + JOB + METRICS ----
        for i in range(5):

            job = Job(
                id=uuid.uuid4(),
                jobType="index",
                job_status="completed",
                created_at=datetime.utcnow(),
            )
            session.add(job)
            session.commit()
            session.refresh(job)

            file = File(
                id=uuid.uuid4(),
                name=f"sample_document_{i+1}.pdf",
                file_type="pdf",
                source="system",
                source_id=f"init_{i}",
                destination_address="s3://bucket/docs",
                index_status="Success",
                user_id=user.id,
                job_id=job.id,  # ✅ CORRECT LINK
                indexVersion="v1.0",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            session.add(file)

            # ---- STEP METRICS ----
            steps = ["extract", "search", "index"]
            for step in steps:
                metric = StepMetric(
                    id=uuid.uuid4(),
                    step=step,
                    status="success",
                    job_id=job.id,  # ✅ CORRECT
                    duration=1.5,
                    created_at=datetime.utcnow(),
                )
                session.add(metric)

        session.commit()
        print("✅ Seeding completed successfully")


# -------------------- HEALTH --------------------

@app.get("/health")
def health_check():
    try:
        with engine.connect():
            return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "error", "database": "disconnected"}


# -------------------- ROUTES --------------------

@app.get("/")
def root():
    return {"message": "Backend is running"}


# -------- STATS --------
@app.get("/stats")
def read_stats(session: Session = Depends(get_session)):
    return crud.get_stats(session)


@app.get("/stats/step-metrics-by-type")
def read_step_metrics_by_type(session: Session = Depends(get_session)):
    return crud.get_step_metrics_by_type(session)


# -------- FILES --------
@app.get("/files")
def read_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session),
):
    return crud.get_recent_files(session, skip, limit)


@app.get("/files/{file_id}")
def read_file_details(file_id: str, session: Session = Depends(get_session)):
    details = crud.get_file_details(session, file_id)
    if not details:
        raise HTTPException(status_code=404, detail="File not found")
    return details


# -------- USERS --------
@app.get("/users")
def read_users(session: Session = Depends(get_session)):
    return crud.get_users(session)


# -------- JOBS --------
@app.get("/jobs")
def read_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    job_id: str = Query(None),
    session: Session = Depends(get_session),
):
    return crud.get_jobs(session, skip, limit, job_id)


@app.get("/jobs/{job_id}")
def read_job_details(job_id: str, session: Session = Depends(get_session)):
    job = crud.get_job_by_id(session, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# -------- STEP METRICS --------
@app.get("/step_metrics")
def read_step_metrics(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    session: Session = Depends(get_session),
):
    return crud.get_step_metrics(session, skip, limit)


@app.get("/metrics/{file_id}")
def read_metrics_by_file(file_id: str, session: Session = Depends(get_session)):
    return crud.get_metrics_by_file_id(session, file_id)
