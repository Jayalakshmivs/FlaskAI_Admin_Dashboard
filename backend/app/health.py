"""
health.py – Health check endpoints for monitoring and Coolify/Docker.

Provides:
  - GET /health        → Basic liveness check (always returns 200)
  - GET /health/ready  → Readiness check (verifies DB connectivity + row counts)
"""

import time
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, text

logger = logging.getLogger("health")

router = APIRouter(tags=["Health"])


def _get_session():
    """Placeholder — will be overridden when router is included in main app."""
    raise NotImplementedError


@router.get("/health")
def liveness():
    """Basic liveness probe — confirms the process is running."""
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready")
def readiness(session: Session = Depends(_get_session)):
    """
    Readiness probe — confirms DB is connected and has data.
    Returns row counts for each core table.
    Used by Docker healthcheck / Coolify to verify full readiness.
    """
    start = time.time()
    checks = {}

    tables = ["users", "jobs", "files", "step_metrics"]
    all_ok = True

    for table in tables:
        try:
            result = session.exec(text(f'SELECT COUNT(*) FROM "{table}"'))
            count = result.one()[0]
            checks[table] = {"status": "ok", "rows": count}
            if count == 0:
                checks[table]["status"] = "empty"
                all_ok = False
        except Exception as e:
            checks[table] = {"status": "error", "error": str(e)}
            all_ok = False

    elapsed_ms = round((time.time() - start) * 1000, 2)

    return {
        "status": "ready" if all_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": checks,
        "response_time_ms": elapsed_ms,
    }
