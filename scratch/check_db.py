import os
import psycopg2
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def check_database():
    # Try to get DATABASE_URL from environment or .env
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("WARNING: DATABASE_URL not found in environment.")
        print("Falling back to local PostgreSQL defaults for testing...")
        db_url = "postgresql://postgres:postgres@localhost:5432/flaskai"

    print(f"Attempting to connect to: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            print("✓ Connection successful!")
            
            tables = ['users', 'jobs', 'files', 'step_metrics']
            for table in tables:
                try:
                    result = conn.execute(text(f"SELECT count(*) FROM {table}"))
                    count = result.scalar()
                    print(f"  - Table '{table}': {count} rows")
                except Exception as e:
                    print(f"  - Table '{table}': Error querying (Table might not exist)")

            # Check for generators
            try:
                res = conn.execute(text("SELECT source_id, count(*) FROM files GROUP BY source_id"))
                print("\nFile Source Breakdown:")
                for sid, count in res:
                    print(f"  {sid}: {count}")
            except:
                pass

    except Exception as e:
        print(f"✗ Connection failed: {e}")
        print("\nPossible solutions:")
        print("1. If running locally, make sure your PostgreSQL service is started.")
        print("2. If using Docker, make sure the 'db' container is healthy.")
        print("3. Check if your .env file has the correct DATABASE_URL.")

if __name__ == "__main__":
    check_database()
