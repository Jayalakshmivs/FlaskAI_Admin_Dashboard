from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine
import os
import logging

from . import crud
from .models import *

# ---------------- LOGGING ----------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    allow_origins=["*"],  # restrict later in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- STARTUP ----------------
@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    logger.info("✅ Backend started & DB connected")


# ---------------- HEALTH ----------------
@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------- STATS ----------------
@app.get("/stats")
def get_stats(session: Session = Depends(get_session)):
    try:
        data = crud.get_stats(session)
        logger.info(f"Stats fetched: {data.get('total_files', 0)} files")
        return data
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail="Stats fetch failed")


# ---------------- FILES ----------------
@app.get("/files")
def get_files(
    skip: int = Query(0),
    limit: int = Query(200),
    session: Session = Depends(get_session)
):
    try:
        data = crud.get_recent_files(session, skip, limit)
        logger.info(f"Files fetched: {len(data.get('items', []))}")
        return data
    except Exception as e:
        logger.error(f"Files error: {e}")
        raise HTTPException(status_code=500, detail="Files fetch failed")


# ---------------- FILE DETAILS ----------------
@app.get("/files/{file_id}")
def get_file_details(file_id: str, session: Session = Depends(get_session)):
    try:
        return crud.get_file_details(session, file_id)
    except Exception as e:
        logger.error(f"File details error: {e}")
        raise HTTPException(status_code=500, detail="File details failed")


# ---------------- METRICS BY FILE ----------------
@app.get("/metrics/{file_id}")
def get_metrics(file_id: str, session: Session = Depends(get_session)):
    try:
        return crud.get_metrics_by_file_id(session, file_id)
    except Exception as e:
        logger.error(f"Metrics error: {e}")
        raise HTTPException(status_code=500, detail="Metrics fetch failed")


# ---------------- JOBS ----------------
@app.get("/jobs")
def get_jobs(
    skip: int = Query(0),
    limit: int = Query(50),
    session: Session = Depends(get_session)
):
    try:
        return crud.get_jobs(session, skip, limit)
    except Exception as e:
        logger.error(f"Jobs error: {e}")
        raise HTTPException(status_code=500, detail="Jobs fetch failed")


# ---------------- JOB BY ID ----------------
@app.get("/jobs/{job_id}")
def get_job(job_id: str, session: Session = Depends(get_session)):
    try:
        job = crud.get_job_by_id(session, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job error: {e}")
        raise HTTPException(status_code=500, detail="Job fetch failed")


# ---------------- STEP METRICS ----------------

# ✅ FIXED ROUTE NAME (IMPORTANT)
@app.get("/step_metrics")
def get_step_metrics(
    skip: int = Query(0),
    limit: int = Query(100),
    session: Session = Depends(get_session)
):
    try:
        data = crud.get_step_metrics(session, skip, limit)
        logger.info(f"Step metrics fetched: {data.get('total', 0)}")
        return data
    except Exception as e:
        logger.error(f"Step metrics error: {e}")
        raise HTTPException(status_code=500, detail="Step metrics fetch failed")


# ---------------- USERS ----------------
@app.get("/users")
def get_users(session: Session = Depends(get_session)):
    try:
        data = crud.get_users(session)
        logger.info(f"Users fetched: {len(data)}")
        return data
    except Exception as e:
        logger.error(f"Users error: {e}")
        raise HTTPException(status_code=500, detail="Users fetch failed")
