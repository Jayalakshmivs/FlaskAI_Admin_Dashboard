from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine
from typing import List
from . import crud, models

import os
from dotenv import load_dotenv

load_dotenv()

import time
from sqlalchemy.exc import OperationalError

# Prioritize PostgreSQL URL from environment, fallback to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dashboard.db")

def create_engine_with_retry(url, max_retries=5, delay=5):
    print(f"Connecting to database at {url.split('@')[-1] if '@' in url else url}...")
    for i in range(max_retries):
        try:
            connect_args = {}
            if url.startswith("sqlite"):
                connect_args = {"check_same_thread": False}
            
            engine = create_engine(url, connect_args=connect_args)

            # Verify connection
            with engine.connect() as conn:
                print("Successfully connected to the database!")
                return engine

        except OperationalError as e:
            print(f"Database connection attempt {i+1}/{max_retries} failed. Retrying in {delay}s...")
            if i == max_retries - 1:
                print("Max retries reached. Could not connect to database.")
                raise e
            time.sleep(delay)

engine = create_engine_with_retry(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

app = FastAPI(title="AI Processing Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ✅ HEALTH CHECK ENDPOINT (Fix for Coolify)
@app.get("/health")
def health_check():
    try:
        # Optional DB check
        with engine.connect() as conn:
            return {
                "status": "ok",
                "database": "connected"
            }
    except Exception:
        return {
            "status": "error",
            "database": "disconnected"
        }

# -------------------- EXISTING ROUTES --------------------

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
        session, 
        skip=skip, 
        limit=limit, 
        status=status, 
        search=search, 
        email=email, 
        file_id=file_id, 
        start_date=start_date, 
        end_date=end_date
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
    return crud.get_jobs(session, skip=skip, limit=limit, job_id=job_id)

@app.get("/step_metrics")
def read_step_metrics(
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000), 
    session: Session = Depends(get_session)
):
    return crud.get_step_metrics(session, skip=skip, limit=limit)

@app.get("/jobs/{job_id}")
def read_job_details(job_id: str, session: Session = Depends(get_session)):
    job = crud.get_job_by_id(session, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.get("/metrics/{file_id}")
def read_metrics_by_file(file_id: str, session: Session = Depends(get_session)):
    return crud.get_metrics_by_file_id(session, file_id)
