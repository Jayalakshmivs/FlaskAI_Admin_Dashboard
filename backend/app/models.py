import uuid
from datetime import datetime
from typing import Optional, List

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB


# -------------------- USER --------------------

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    provider_id: uuid.UUID

    username: Optional[str] = None
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None

    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None

    # ✅ FIX: keep DB column name as "metadata"
    metadata_: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSONB))

    is_deleted: bool = False
    quota: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    files: List["File"] = Relationship(back_populates="user")


# -------------------- FILE --------------------

class File(SQLModel, table=True):
    __tablename__ = "files"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    name: str
    file_type: str

    source: str
    source_id: str
    destination_address: str

    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

    metadata_: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSONB))
    is_deleted: bool = False

    job_id: Optional[uuid.UUID] = Field(default=None, foreign_key="jobs.id")
    user_id: uuid.UUID = Field(foreign_key="users.id")

    index_status: str

    indexDateTime: Optional[datetime] = Field(
        default=None,
        sa_column=Column("indexDateTime", DateTime(timezone=True))
    )

    indexVersion: str = Field(sa_column=Column("indexVersion", String))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    content_hash: Optional[str] = None

    user: Optional["User"] = Relationship(back_populates="files")
    job: Optional["Job"] = Relationship(back_populates="files")


# -------------------- JOB --------------------

class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    jobType: str = Field(sa_column=Column("jobType", String))

    input: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    output: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    job_status: str
    metadata_: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSONB))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    error_message: Optional[str] = None
    is_deleted: bool = False

    updated_at: datetime = Field(default_factory=datetime.utcnow)

    files: List["File"] = Relationship(back_populates="job")


# -------------------- STEP METRICS --------------------

class StepMetric(SQLModel, table=True):
    __tablename__ = "step_metrics"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    is_deleted: bool = False

    metadata_: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSONB))

    # ✅ FIX: rename logically (keep DB column same)
    step_name: str = Field(sa_column=Column("step", String, index=True))

    status: str = Field(index=True)

    # ✅ FIX: align with frontend naming
    duration_ms: Optional[float] = Field(default=None, sa_column=Column("duration"))

    input: Optional[dict] = Field(default=None, sa_column=Column("input", JSONB))
    output: Optional[dict] = Field(default=None, sa_column=Column("output", JSONB))
    metrics: Optional[dict] = Field(default=None, sa_column=Column("metrics", JSONB))

    file_id: Optional[uuid.UUID] = Field(default=None, index=True)
    job_id: Optional[uuid.UUID] = Field(default=None, index=True)
    user_id: Optional[uuid.UUID] = Field(default=None, index=True)

    file_page_id: Optional[uuid.UUID] = None


# -------------------- PROCESSING STEP --------------------

class ProcessingStep(SQLModel, table=True):
    __tablename__ = "pipeline_steps"

    id: Optional[int] = Field(default=None, primary_key=True)

    file_id: uuid.UUID = Field(index=True)
    file_name: str

    user_email: Optional[str] = Field(default=None, index=True)
    file_type: Optional[str] = None

    step_name: Optional[str] = None
    status: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    duration_seconds: Optional[int] = None

    input_payload: Optional[dict] = Field(default=None, sa_column=Column("input_payload", JSONB))
    output_payload: Optional[dict] = Field(default=None, sa_column=Column("output_payload", JSONB))
    error_context: Optional[dict] = Field(default=None, sa_column=Column("error_context", JSONB))
    timing_breakdown: Optional[dict] = Field(default=None, sa_column=Column("timing_breakdown", JSONB))


# -------------------- STATS RESPONSE --------------------

class FileStats(SQLModel):
    total_files: int
    total_jobs: int
    active_users: int
    total_success: int
    total_failures: int
    total_in_progress: int
    success_rate: float
    processing_rate: float
    files_by_type: dict
    failures_by_type: dict
    failures_by_step: dict
    pipeline_performance: dict
