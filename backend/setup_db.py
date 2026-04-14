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

# SQL files relative to the project root (one level up from backend/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(__file__))
SQL_FILES = [
    os.path.join(PROJECT_ROOT, "datasets", "users.sql"),
    os.path.join(PROJECT_ROOT, "datasets", "jobs.sql"),
    os.path.join(PROJECT_ROOT, "datasets", "files.sql"),
    os.path.join(PROJECT_ROOT, "datasets", "step_metrics_fixed.sql"),
]

DROP_ORDER = [
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
            # Split on semicolons and run statement-by-statement so a bad row
            # doesn't abort the whole import.
            statements = [s.strip() for s in file_content.split(";") if s.strip()]
            ok = bad = 0
            for stmt in statements:
                try:
                    cur.execute(stmt)
                    raw.commit()
                    ok += 1
                except Exception as e:
                    raw.rollback()
                    bad += 1
            print(f"  done in {time.time()-t0:.1f}s — {ok} OK, {bad} skipped")
        finally:
            raw.close()

    print("\nSetup complete.")

except Exception as exc:
    import traceback
    traceback.print_exc()
    print(f"\nFATAL: {exc}")
    sys.exit(1)
