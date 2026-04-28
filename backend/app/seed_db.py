import os
import psycopg2
import re
from dotenv import load_dotenv

# Inside Docker, the environment variables are already set
load_dotenv()

def execute_large_sql(cur, filepath):
    """Executes a large SQL file by splitting it into individual statements."""
    print(f"Processing large file: {filepath}...")
    try:
        # Inside Docker, datasets are at /app/../datasets/ or similar
        # But we mounted ./backend to /app, so we need to go up one level to find datasets
        actual_path = filepath
        if not os.path.exists(actual_path):
            actual_path = os.path.join("/app", "..", filepath)
        
        with open(actual_path, 'r', encoding='utf-8', errors='ignore') as f:
            statement = ""
            count = 0
            for line in f:
                if line.strip().startswith('--') or not line.strip():
                    continue
                statement += line
                if line.strip().endswith(';'):
                    try:
                        cur.execute(statement)
                        count += 1
                        if count % 500 == 0:
                            print(f"  ✓ Processed {count} rows...")
                    except:
                        pass
                    statement = ""
            print(f"✓ Total {count} statements processed.")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

def seed_database():
    # Use the internal Docker database URL
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/dashboard")
    
    print(f"Connecting to database at {db_url}...")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()

        # Paths relative to the root (mounted at /app/..)
        datasets = [
            ('datasets/users.sql', 'Users'),
            ('datasets/jobs.sql', 'Jobs'),
            ('datasets/files.sql', 'Files'),
            ('datasets/step_metrics.sql', 'Step Metrics')
        ]

        for rel_path, name in datasets:
            # Check multiple possible locations for the datasets folder
            filepath = rel_path
            if not os.path.exists(filepath):
                filepath = os.path.join("/app", "..", rel_path)
            
            if not os.path.exists(filepath):
                print(f"Skipping {name}: File not found at {filepath}")
                continue

            print(f"Importing {name}...")
            if name == 'Step Metrics':
                execute_large_sql(cur, filepath)
            else:
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        sql = f.read()
                        sql = re.sub(r'--.*', '', sql)
                        cur.execute(sql)
                    print(f"✓ {name} imported successfully.")
                except Exception as e:
                    print(f"⚠ Warning importing {name}: {e}")

        cur.close()
        conn.close()
        print("\nSeeding complete! Please refresh your dashboard.")

    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    seed_database()
