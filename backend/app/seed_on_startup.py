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
import textwrap

import psycopg2

logger = logging.getLogger("seed_on_startup")
logger.setLevel(logging.INFO)

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


def seed_database(database_url: str) -> None:
    """
    Main entry point. Connect to PostgreSQL using the DATABASE_URL
    and load SQL files if the database is empty.
    """
    logger.info("=== Seed-on-startup: checking database ===")

    # Quick check: if "users" already has data, skip everything
    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        cur = conn.cursor()
    except Exception as e:
        logger.error(f"Cannot connect to database for seeding: {e}")
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
                f"Database already seeded — "
                f"users={counts['users']}, jobs={counts['jobs']}, "
                f"files={counts['files']}, step_metrics={counts['step_metrics']}. "
                f"Skipping seed."
            )
            cur.close()
            conn.close()
            return

        logger.info("Database is empty. Starting seed process...")

        # Disable FK checks during bulk import
        cur.execute("SET session_replication_role = 'replica';")

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
                logger.info(f"  ✓ {filename} loaded successfully")
            except Exception as e:
                conn.rollback()
                logger.error(f"  ✗ {filename} failed: {e}")
                # Continue with next file
                continue

        # Re-enable FK checks
        cur.execute("SET session_replication_role = 'origin';")
        conn.commit()

        # Final count report
        logger.info("=== Seed complete. Row counts: ===")
        for tbl in ["users", "jobs", "files", "step_metrics"]:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{tbl}"')
                count = cur.fetchone()[0]
                logger.info(f"  {tbl}: {count} rows")
            except Exception:
                logger.info(f"  {tbl}: could not count")
                conn.rollback()

    except Exception as e:
        logger.error(f"Seed process error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()
