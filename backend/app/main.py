from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select
from typing import List
from . import crud, models

import os
from dotenv import load_dotenv
import time
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

            with engine.connect() as conn:
                print(f"✅ {db_type} Database connected successfully")
                return engine

        except OperationalError as e:
            print(f"❌ Attempt {i+1}/{max_retries} failed: {str(e)}")
            if i == max_retries - 1:
                print("🚨 CRITICAL: Could not connect to database. Falling back to internal initialization...")
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

# -------------------- ROBUST SEEDING --------------------

def seed_database():
    """
    Ensures the database has at least some data to show on the dashboard.
    """
    from .models import StepMetric, File, User, Job
    import uuid
    from datetime import datetime

    with Session(engine) as session:
        # 1. Check for User
        user = session.exec(select(User)).first()
        if not user:
            print("👤 Seeding default admin user...")
            user = User(
                id=uuid.uuid4(),
                provider_id=uuid.uuid4(),
                email="admin@example.com",
                username="admin",
                full_name="System Admin",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(user)
            session.commit()
            session.refresh(user)

        # 2. Check for Files
        existing_file = session.exec(select(File)).first()
        if not existing_file:
            print("📁 Seeding initial system files...")
            files = []
            for i in range(5):
                f = File(
                    id=uuid.uuid4(),
                    name=f"sample_document_{i+1}.pdf",
                    file_type="pdf",
                    source="system",
                    source_id=f"init_{i}",
                    destination_address="s3://bucket/docs",
                    index_status="Success" if i % 2 == 0 else "Failure",
                    user_id=user.id,
                    indexVersion="v1.0"
                )
                files.append(f)
                session.add(f)
            session.commit()
            # Refresh to get IDs
            for f in files: session.refresh(f)
            
            # 3. Seed Metrics for these files
            print("📊 Seeding linked step metrics...")
            steps = ["extract", "search", "index", "valid", "store"]
            for f in files:
                for step in steps:
                    m = StepMetric(
                        id=uuid.uuid4(),
                        step=step,
                        status="success" if f.index_status == "Success" else "failed",
                        file_id=f.id,
                        duration=1.5 + (i * 0.2)
                    )
                    session.add(m)
            session.commit()
            print("✅ Database seeding completed")
        else:
            print("✅ Database already has data. Skipping seed.")

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
@app.get("/stats")
def read_stats(session: Session = Depends(get_session)):
    return crud.get_stats(session)

@app.get("/stats/step-metrics-by-type")
def read_step_metrics_by_type(session: Session = Depends(get_session)):
    return crud.get_step_metrics_by_type(session)

@app.get("/files")
def read_files(
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000), 
    status: str = Query(None),
    search: str = Query(None),
    email: str = Query(None),
    file_id: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    session: Session = Depends(get_session)
):
    return crud.get_recent_files(
        session, skip, limit, status, search, email, file_id, start_date, end_date
    )

@app.get("/files/{file_id}")
def read_file_details(file_id: str, session: Session = Depends(get_session)):
    details = crud.get_file_details(session, file_id)
    if not details:
        raise HTTPException(status_code=404, detail="File not found")
    return details

@app.get("/users")
def read_users(session: Session = Depends(get_session)):
    return crud.get_users(session)

@app.get("/jobs")
def read_jobs(
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000), 
    job_id: str = Query(None), 
    session: Session = Depends(get_session)
):
    return crud.get_jobs(session, skip, limit, job_id)

@app.get("/step_metrics")
def read_step_metrics(
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000), 
    session: Session = Depends(get_session)
):
    return crud.get_step_metrics(session, skip, limit)

@app.get("/jobs/{job_id}")
def read_job_details(job_id: str, session: Session = Depends(get_session)):
    job = crud.get_job_by_id(session, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/metrics/{file_id}")
def read_metrics_by_file(file_id: str, session: Session = Depends(get_session)):
    return crud.get_metrics_by_file_id(session, file_id)
