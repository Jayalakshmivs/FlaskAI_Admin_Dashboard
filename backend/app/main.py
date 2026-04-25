from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine
import os

from . import crud
from .models import *

# ---------------- DATABASE ----------------

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("❌ DATABASE_URL not set")

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True
)


def get_session():
    with Session(engine) as session:
        yield session


# ---------------- APP ----------------

app = FastAPI(title="FlaskAI Admin Backend")


# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- STARTUP ----------------
@app.on_event("startup")
def on_startup():
    # Only ensure tables exist (DO NOT seed)
    SQLModel.metadata.create_all(engine)
    print("✅ Backend started & DB connected")


# ---------------- HEALTH CHECK ----------------
@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------- ROUTES ----------------

# Dashboard stats
@app.get("/stats")
def get_stats(session: Session = Depends(get_session)):
    return crud.get_stats(session)


# Files (recent)
@app.get("/files")
def get_files(skip: int = 0, limit: int = 200, session: Session = Depends(get_session)):
    return crud.get_recent_files(session, skip, limit)


# File details (steps)
@app.get("/files/{file_id}")
def get_file_details(file_id: str, session: Session = Depends(get_session)):
    return crud.get_file_details(session, file_id)


# Metrics per file
@app.get("/metrics/{file_id}")
def get_metrics(file_id: str, session: Session = Depends(get_session)):
    return crud.get_metrics_by_file_id(session, file_id)


# Jobs
@app.get("/jobs")
def get_jobs(skip: int = 0, limit: int = 50, session: Session = Depends(get_session)):
    return crud.get_jobs(session, skip, limit)


# Job by ID
@app.get("/jobs/{job_id}")
def get_job(job_id: str, session: Session = Depends(get_session)):
    job = crud.get_job_by_id(session, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


# Step metrics
@app.get("/step-metrics")
def get_step_metrics(skip: int = 0, limit: int = 100, session: Session = Depends(get_session)):
    return crud.get_step_metrics(session, skip, limit)


# Users
@app.get("/users")
def get_users(session: Session = Depends(get_session)):
    return crud.get_users(session)
