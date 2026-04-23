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
    print(f"Connecting to database at {url.split('@')[-1] if '@' in url else url}...")
    
    for i in range(max_retries):
        try:
            connect_args = {}
            if url.startswith("sqlite"):
                connect_args = {"check_same_thread": False}
            
            engine = create_engine(url, connect_args=connect_args)

            with engine.connect() as conn:
                print("✅ Database connected")
                return engine

        except OperationalError:
            print(f"❌ Attempt {i+1}/{max_retries} failed. Retrying in {delay}s...")
            if i == max_retries - 1:
                raise
            time.sleep(delay)

engine = create_engine_with_retry(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

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
    seed_step_metrics()

# -------------------- SEED DATA (IMPORTANT FIX) --------------------

def seed_step_metrics():
    """
    Adds sample step metrics ONLY if table is empty.
    Prevents duplicate inserts.
    """
    from .models import StepMetric

    with Session(engine) as session:
        existing = session.exec(select(StepMetric)).first()

        if existing:
            print("✅ step_metrics already has data. Skipping seed.")
            return

        print("⚡ Seeding step_metrics data...")

        data = []
        for i in range(1000):
            data.append(
                StepMetric(
                    step_name=f"step_{i % 10}",
                    status="success" if i % 3 else "failed",
                    file_id=None
                )
            )

        session.add_all(data)
        session.commit()

        print("✅ step_metrics seeded successfully")

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
