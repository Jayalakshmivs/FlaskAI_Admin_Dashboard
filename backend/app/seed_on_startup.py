"""
seed_on_startup.py – Loads SQL dataset files into PostgreSQL on first boot.

Runs automatically when the backend starts. If the database tables are
already populated, seeding is skipped. This replaces Docker's
docker-entrypoint-initdb.d mechanism so that:
  1. Git LFS pointer files are detected and skipped.
  2. Foreign-key ordering is handled correctly.
  3. Re-deploys on Coolify always have data (not just first boot).
"""

import gzip
import os
import logging

import psycopg2

logger = logging.getLogger("seed_on_startup")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(name)s | %(message)s"))
    logger.addHandler(handler)

# Ordered by FK dependencies: users → jobs → files → step_metrics
SQL_FILES = [
    "users.sql",
    "jobs.sql",
    "files.sql",
    "step_metrics.sql",
]

DATASETS_DIR = os.environ.get("DATASETS_DIR", "/app/datasets")


def _is_lfs_pointer(path: str) -> bool:
    """Return True if the file is a Git LFS pointer, not actual SQL."""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            first_line = f.readline(128)
        return first_line.startswith("version https://git-lfs.github.com")
    except Exception:
        return False


def _resolve_sql_path(filename: str) -> str | None:
    """Find the SQL file – prefers .gz compressed version."""
    gz_path = os.path.join(DATASETS_DIR, filename + ".gz")
    raw_path = os.path.join(DATASETS_DIR, filename)

    # Prefer compressed version (avoids LFS issues entirely)
    if os.path.isfile(gz_path):
        return gz_path

    if os.path.isfile(raw_path) and not _is_lfs_pointer(raw_path):
        return raw_path

    return None


def _read_sql(path: str) -> str:
    """Read SQL from a file, auto-decompressing .gz files."""
    if path.endswith(".gz"):
        with gzip.open(path, "rt", encoding="utf-8") as f:
            return f.read()
    else:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()


def _table_has_data(cur, table: str) -> bool:
    """Check if a table exists and has at least one row."""
    try:
        cur.execute(f'SELECT 1 FROM "{table}" LIMIT 1')
        return cur.fetchone() is not None
    except psycopg2.errors.UndefinedTable:
        cur.connection.rollback()
        return False
    except Exception:
        cur.connection.rollback()
        return False


def _list_datasets_dir():
    """Log contents of the datasets directory for debugging."""
    logger.info(f"  DATASETS_DIR = {DATASETS_DIR}")
    if not os.path.isdir(DATASETS_DIR):
        logger.error(f"  ✗ Directory does NOT exist: {DATASETS_DIR}")
        return
    files = os.listdir(DATASETS_DIR)
    logger.info(f"  Files in {DATASETS_DIR}: {files}")
    for f in files:
        fpath = os.path.join(DATASETS_DIR, f)
        size = os.path.getsize(fpath)
        is_lfs = _is_lfs_pointer(fpath) if not f.endswith(".gz") else False
        logger.info(f"    {f}: {size/1024:.1f}KB{' [LFS POINTER]' if is_lfs else ''}")


def seed_database(database_url: str) -> None:
    """
    Main entry point. Connect to PostgreSQL using the DATABASE_URL
    and load SQL files if the database is empty.
    """
    logger.info("=" * 60)
    logger.info("=== Seed-on-startup: checking database ===")
    logger.info("=" * 60)

    # Log what files are available
    _list_datasets_dir()

    # Quick check: if "users" already has data, skip everything
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        cur = conn.cursor()
        logger.info("  ✓ Connected to database")
    except Exception as e:
        logger.error(f"  ✗ Cannot connect to database for seeding: {e}")
        return

    try:
        if _table_has_data(cur, "users"):
            # Count rows to report
            counts = {}
            for tbl in ["users", "jobs", "files", "step_metrics"]:
                try:
                    cur.execute(f'SELECT COUNT(*) FROM "{tbl}"')
                    counts[tbl] = cur.fetchone()[0]
                except Exception:
                    counts[tbl] = "N/A"
                    conn.rollback()
            logger.info(
                f"  Database already seeded — "
                f"users={counts['users']}, jobs={counts['jobs']}, "
                f"files={counts['files']}, step_metrics={counts['step_metrics']}. "
                f"Skipping seed."
            )
            cur.close()
            conn.close()
            return

        logger.info("  Database is empty. Starting seed process...")

        # ─── CRITICAL FIX ───
        # SQLModel's create_db_and_tables() already created empty tables
        # with foreign key constraints. The SQL dump files contain their own
        # DROP TABLE + CREATE TABLE statements, but DROP TABLE will fail
        # if another table has a FK pointing to it.
        # Solution: drop ALL tables first in reverse-dependency order with CASCADE.
        logger.info("  Dropping existing empty tables (CASCADE) to avoid FK conflicts...")
        for tbl in reversed(["users", "jobs", "files", "step_metrics",
                             "pipeline_steps"]):
            try:
                cur.execute(f'DROP TABLE IF EXISTS "{tbl}" CASCADE;')
                logger.info(f"    Dropped {tbl}")
            except Exception as e:
                logger.warning(f"    Could not drop {tbl}: {e}")
                conn.rollback()
        conn.commit()

        # Disable FK trigger enforcement during bulk INSERT
        cur.execute("SET session_replication_role = 'replica';")
        conn.commit()

        loaded_count = 0
        for filename in SQL_FILES:
            path = _resolve_sql_path(filename)
            if not path:
                logger.warning(
                    f"  ⚠ {filename}: not found or is a Git LFS pointer – SKIPPED"
                )
                continue

            size_mb = os.path.getsize(path) / 1024 / 1024
            logger.info(f"  → Loading {filename} ({size_mb:.1f}MB) from {path}...")

            try:
                sql = _read_sql(path)
                cur.execute(sql)
                conn.commit()
                loaded_count += 1
                logger.info(f"  ✓ {filename} loaded successfully")
            except Exception as e:
                conn.rollback()
                # Re-enable replica mode after rollback
                cur.execute("SET session_replication_role = 'replica';")
                conn.commit()
                logger.error(f"  ✗ {filename} FAILED: {e}")
                continue

        # Re-enable FK checks
        cur.execute("SET session_replication_role = 'origin';")
        conn.commit()

        # Final count report
        logger.info("=" * 60)
        logger.info(f"=== Seed complete ({loaded_count}/{len(SQL_FILES)} files). Row counts: ===")
        for tbl in ["users", "jobs", "files", "step_metrics"]:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{tbl}"')
                count = cur.fetchone()[0]
                logger.info(f"  {tbl}: {count} rows")
            except Exception:
                logger.info(f"  {tbl}: table does not exist or error")
                conn.rollback()
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Seed process FATAL error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        conn.rollback()
    finally:
        cur.close()
        conn.close()
