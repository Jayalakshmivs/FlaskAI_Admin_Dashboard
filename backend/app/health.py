"""
health.py – Full-stack health check for the entire FlaskAI Admin Dashboard.

Checks all three layers in a single response:
  - GET /health           → Basic liveness (process running)
  - GET /health/ready     → Full-stack readiness (Database + Backend + Frontend)

Each service is checked independently so you can see exactly what's
healthy and what's degraded in Coolify / Docker logs.
"""

import os
import time
import platform
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlmodel import Session, text

logger = logging.getLogger("health")

router = APIRouter(tags=["Health"])

# Frontend URL inside Docker network (nginx on port 80)
FRONTEND_URL = os.getenv("FRONTEND_HEALTH_URL", "http://frontend:80")


def _get_session():
    """Placeholder — overridden via app.dependency_overrides in main.py."""
    raise NotImplementedError


# ─────────────────────────────────────────────
#  Liveness  (lightweight, always 200)
# ─────────────────────────────────────────────

@router.get("/health")
def liveness():
    """Basic liveness probe — confirms the backend process is running."""
    return {
        "status": "ok",
        "service": "backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ─────────────────────────────────────────────
#  Full-Stack Readiness
# ─────────────────────────────────────────────

def _check_database(session: Session) -> dict:
    """
    Check PostgreSQL connectivity, version, and row counts
    for every core table.
    """
    result = {"status": "ok", "tables": {}}
    start = time.time()

    # DB version
    try:
        ver = session.exec(text("SELECT version()")).one()[0]
        result["version"] = ver.split(",")[0]  # e.g. "PostgreSQL 16.2"
    except Exception as e:
        result["status"] = "error"
        result["error"] = f"Cannot query version: {e}"
        return result

    # Table row counts
    tables = ["users", "jobs", "files", "step_metrics"]
    for table in tables:
        try:
            count = session.exec(
                text(f'SELECT COUNT(*) FROM "{table}"')
            ).one()[0]
            tbl_status = "ok" if count > 0 else "empty"
            result["tables"][table] = {"status": tbl_status, "rows": count}
            if count == 0:
                result["status"] = "degraded"
        except Exception as e:
            result["tables"][table] = {"status": "error", "error": str(e)}
            result["status"] = "error"

    # DB size
    try:
        size = session.exec(
            text("SELECT pg_size_pretty(pg_database_size(current_database()))")
        ).one()[0]
        result["database_size"] = size
    except Exception:
        pass

    result["response_time_ms"] = round((time.time() - start) * 1000, 2)
    return result


def _check_backend() -> dict:
    """
    Backend self-check: uptime, memory, Python version, env.
    Since this code IS the backend, this always succeeds if
    the request reaches here.
    """
    import sys

    result = {
        "status": "ok",
        "python_version": platform.python_version(),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "platform": platform.system(),
    }

    # Memory usage (if psutil available, otherwise skip)
    try:
        import psutil
        process = psutil.Process()
        mem = process.memory_info()
        result["memory_mb"] = round(mem.rss / 1024 / 1024, 1)
    except ImportError:
        pass

    # Datasets availability
    datasets_dir = os.getenv("DATASETS_DIR", "/app/datasets")
    if os.path.isdir(datasets_dir):
        files = os.listdir(datasets_dir)
        result["datasets"] = {
            "path": datasets_dir,
            "files_count": len(files),
            "files": files,
        }
    else:
        result["datasets"] = {"status": "missing", "path": datasets_dir}

    return result


def _check_frontend() -> dict:
    """
    Check if the frontend (nginx) is reachable and serving the SPA.
    Makes an HTTP request to the frontend container inside Docker network.
    """
    result = {"status": "unknown"}
    start = time.time()

    try:
        req = urllib.request.Request(FRONTEND_URL, method="GET")
        req.add_header("User-Agent", "HealthCheck/1.0")
        with urllib.request.urlopen(req, timeout=5) as resp:
            status_code = resp.status
            content_type = resp.headers.get("Content-Type", "")
            body = resp.read(512).decode("utf-8", errors="ignore")

            result["status"] = "ok" if status_code == 200 else "degraded"
            result["status_code"] = status_code
            result["content_type"] = content_type
            result["serves_html"] = "<!doctype html>" in body.lower() or "<html" in body.lower()
            result["url"] = FRONTEND_URL

    except urllib.error.URLError as e:
        result["status"] = "unreachable"
        result["error"] = str(e.reason)
        result["url"] = FRONTEND_URL
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
        result["url"] = FRONTEND_URL

    result["response_time_ms"] = round((time.time() - start) * 1000, 2)
    return result


@router.get("/health/ready")
def readiness(session: Session = Depends(_get_session)):
    """
    Full-stack readiness probe.

    Checks all three layers of the application:
      1. Database  — PostgreSQL connectivity, table row counts, DB size
      2. Backend   — Python version, environment, memory, datasets
      3. Frontend  — Nginx reachability, HTML serving

    Overall status is "ready" only when ALL services are healthy.
    """
    total_start = time.time()

    db_check = _check_database(session)
    backend_check = _check_backend()
    frontend_check = _check_frontend()

    # Determine overall status
    statuses = [db_check["status"], backend_check["status"], frontend_check["status"]]
    if all(s == "ok" for s in statuses):
        overall = "ready"
    elif any(s == "error" for s in statuses):
        overall = "unhealthy"
    else:
        overall = "degraded"

    total_ms = round((time.time() - total_start) * 1000, 2)

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_response_time_ms": total_ms,
        "services": {
            "database": db_check,
            "backend": backend_check,
            "frontend": frontend_check,
        },
    }
