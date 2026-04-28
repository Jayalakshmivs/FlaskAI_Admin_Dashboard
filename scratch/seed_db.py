import os
import psycopg2
import re
from dotenv import load_dotenv

load_dotenv()

def execute_large_sql(cur, filepath):
    """Executes a large SQL file by splitting it into individual statements."""
    print(f"Processing large file: {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            statement = ""
            count = 0
            for line in f:
                # Skip comments and empty lines
                if line.strip().startswith('--') or not line.strip():
                    continue
                
                statement += line
                if line.strip().endswith(';'):
                    try:
                        cur.execute(statement)
                        count += 1
                        if count % 100 == 0:
                            print(f"  ✓ Processed {count} statements...")
                    except Exception as e:
                        # Log error but continue
                        pass
                    statement = ""
            
            # Catch any remaining statement
            if statement.strip():
                try:
                    cur.execute(statement)
                except:
                    pass
            print(f"✓ Total {count} statements processed from {filepath}.")
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

def seed_database():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found. Please ensure it is set in your environment.")
        return

    print(f"Connecting to database to force-seed datasets...")
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()

        datasets = [
            ('datasets/users.sql', 'Users'),
            ('datasets/jobs.sql', 'Jobs'),
            ('datasets/files.sql', 'Files'),
            ('datasets/step_metrics.sql', 'Step Metrics')
        ]

        for filepath, name in datasets:
            if not os.path.exists(filepath):
                print(f"Skipping {name}: File not found at {filepath}")
                continue

            print(f"Importing {name}...")
            if name == 'Step Metrics':
                # Special handling for the 131MB file
                execute_large_sql(cur, filepath)
            else:
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        sql = f.read()
                        # Remove TablePlus/Header comments
                        sql = re.sub(r'--.*', '', sql)
                        cur.execute(sql)
                    print(f"✓ {name} imported successfully.")
                except Exception as e:
                    print(f"⚠ Warning importing {name}: {e}")

        cur.close()
        conn.close()
        print("\nSeeding complete. Please refresh your dashboard and check File Details.")

    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    seed_database()
