"""
Database setup script.
Run once to create tables and import seed data from datasets/*.sql
Usage:  python setup_db.py
"""
import os
import sys
import time
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load .env from same directory
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

url = os.getenv("DATABASE_URL", "")
if not url:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

if url.startswith("postgres://"):
    url = url.replace("postgres://", "postgresql://", 1)

engine = create_engine(url)

# SQL files resolution
# In Docker (backend container), datasets are at /app/datasets
# Locally (run from backend/), datasets are at ../datasets
base_dir = os.path.dirname(__file__)
docker_datasets = os.path.join(base_dir, "datasets")
local_datasets = os.path.join(os.path.dirname(base_dir), "datasets")

if os.path.exists(docker_datasets):
    DATASETS_DIR = docker_datasets
elif os.path.exists(local_datasets):
    DATASETS_DIR = local_datasets
else:
    # Default fallback
    DATASETS_DIR = os.path.join(base_dir, "datasets")

SQL_FILES = [
    os.path.join(DATASETS_DIR, "users.sql"),
    os.path.join(DATASETS_DIR, "jobs.sql"),
    os.path.join(DATASETS_DIR, "files.sql"),
    os.path.join(DATASETS_DIR, "step_metrics.sql"),
]

DROP_ORDER = [
    "step_metrics",
    "pipeline_step_metrics",
    "pipeline_steps",
    "files",
    "jobs",
    "users",
]

try:
    with engine.connect() as conn:
        print("Connected to database.")
        print("Dropping existing tables…")
        for table in DROP_ORDER:
            try:
                conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE;'))
            except Exception as e:
                print(f"  Notice dropping {table}: {e}")
        conn.commit()

    for sql_path in SQL_FILES:
        if not os.path.exists(sql_path):
            print(f"WARNING: {sql_path} not found — skipping.")
            continue

        print(f"Importing {os.path.basename(sql_path)} …", flush=True)
        t0 = time.time()

        with open(sql_path, "r", encoding="utf-8", errors="replace") as fh:
            file_content = fh.read().replace("\x00", "")

        raw = engine.raw_connection()
        try:
            cur = raw.cursor()
            # Bypass foreign key checks for fragmented data loading
            cur.execute("SET session_replication_role = 'replica';")
            
            # Split on semicolons and run statement-by-statement
            statements = [s.strip() for s in file_content.split(";") if s.strip()]
            ok = bad = 0
            for stmt in statements:
                try:
                    cur.execute(stmt)
                    raw.commit()
                    ok += 1
                except Exception:
                    raw.rollback()
                    bad += 1
            
            # Restore constraints
            cur.execute("SET session_replication_role = 'origin';")
            raw.commit()
            print(f"  done in {time.time()-t0:.1f}s — {ok} OK, {bad} skipped")
        finally:
            raw.close()

    print("\nSetup complete.")

except Exception as exc:
    import traceback
    traceback.print_exc()
    print(f"\nFATAL: {exc}")
    sys.exit(1)
