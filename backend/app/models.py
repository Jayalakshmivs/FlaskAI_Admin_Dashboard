import uuid
from datetime import datetime
from typing import Optional, Any, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(primary_key=True)
    provider_id: uuid.UUID
    username: Optional[str] = None
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None
    last_login_ip: Optional[str] = None
    metadata_: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSONB))
    is_deleted: bool = False
    quota: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    files: List["File"] = Relationship(back_populates="user")


class ProcessingStep(SQLModel, table=True):
    """Legacy pipeline_steps table — kept for backwards compatibility."""
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
    input_payload:    Optional[dict] = Field(default=None, sa_column=Column("input_payload",    JSONB))
    output_payload:   Optional[dict] = Field(default=None, sa_column=Column("output_payload",   JSONB))
    error_context:    Optional[dict] = Field(default=None, sa_column=Column("error_context",    JSONB))
    timing_breakdown: Optional[dict] = Field(default=None, sa_column=Column("timing_breakdown", JSONB))


class File(SQLModel, table=True):
    __tablename__ = "files"

    id: uuid.UUID = Field(primary_key=True)
    name: str
    file_type: str
    source: str
    source_id: str
    destination_address: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    metadata_: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSONB))
    is_deleted: bool = False
    job_id: Optional[uuid.UUID] = Field(default=None, foreign_key="jobs.id")
    index_status: str
    indexDateTime: Optional[datetime] = Field(
        default=None, sa_column=Column("indexDateTime", DateTime(timezone=True))
    )
    indexVersion: str = Field(sa_column=Column("indexVersion", String))
    user_id: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    content_hash: Optional[str] = None

    user: Optional["User"] = Relationship(back_populates="files")
    job: Optional["Job"] = Relationship(back_populates="files")


class Job(SQLModel, table=True):
    __tablename__ = "jobs"

    id: uuid.UUID = Field(primary_key=True)
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


class StepMetric(SQLModel, table=True):
    """Maps to the actual DB table: pipeline_step_metrics."""
    __tablename__ = "step_metrics"

    id: uuid.UUID = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_deleted: bool = False
    metadata_: Optional[dict] = Field(default=None, sa_column=Column("metadata", JSONB))

    step: str = Field(sa_column=Column("step", String))
    status: str
    duration: Optional[float] = None
    input:   Optional[dict] = Field(default=None, sa_column=Column("input",   JSONB))
    output:  Optional[dict] = Field(default=None, sa_column=Column("output",  JSONB))
    metrics: Optional[dict] = Field(default=None, sa_column=Column("metrics", JSONB))
    file_id: Optional[uuid.UUID] = Field(index=True)
    file_page_id: Optional[uuid.UUID] = None
    job_id: Optional[uuid.UUID] = Field(index=True)
    user_id: Optional[uuid.UUID] = None


class FileStats(SQLModel):
    total_files: int
    success_rate: float
    total_failures: int
    failures_by_type: dict
