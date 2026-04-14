#!/usr/bin/env python3
"""
Quick script to populate step_metrics with test data.
Run: python populate_metrics.py (from within Docker container or with network access to db)
"""
import os
import uuid
import datetime
import psycopg2
import psycopg2.extras

# Database connection
CONNECTION_STRING = "postgresql://postgres:postgres@db:5432/flaskai"

def get_connection():
    return psycopg2.connect(CONNECTION_STRING)

def populate_step_metrics():
    """
    Insert 500 step_metrics rows for the 167 real files.
    Each file gets 3 steps: extract, search, index
    With mixed statuses: comp (72%), fail (15%), prog (13%)
    """
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        # First get all real files WITH their job_ids
        query = """
        SELECT id, job_id FROM files 
        WHERE source = 'system' AND source_id != 'pdf_generator'
        ORDER BY id
        LIMIT 167
        """
        cur.execute(query)
        files = cur.fetchall()
        print(f"Found {len(files)} real files")
        
        # Insert step_metrics
        steps = ['extract', 'search', 'index', 'valid', 'store']
        statuses = ['comp'] * 72 + ['fail'] * 15 + ['prog'] * 13  # 100 total, distributed proportionally
        
        insert_count = 0
        for file_row in files:
            file_id = file_row['id']
            job_id = file_row['job_id']  # Use the correct job_id from the file record
            
            # For each file, insert 5 step metrics
            for step in steps:
                status = statuses[insert_count % len(statuses)]
                
                insert_query = """
                INSERT INTO step_metrics (
                    id, file_id, job_id, step, status, duration, 
                    input, output, created_at, updated_at, is_deleted
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 
                    %s, %s, %s, %s, %s
                )
                """
                
                values = (
                    str(uuid.uuid4()),  # id
                    file_id,  # file_id
                    job_id,  # job_id (from the File record)
                    step,  # step name
                    status,  # status
                    (80 + insert_count % 40) * 1000,  # duration ms (80-120 secs)
                    '{}',  # input (empty JSON)
                    '{}',  # output (empty JSON)
                    datetime.datetime.utcnow(),  # created_at
                    datetime.datetime.utcnow(),  # updated_at
                    False,  # is_deleted
                )
                
                cur.execute(insert_query, values)
                insert_count += 1
                
                if insert_count % 100 == 0:
                    conn.commit()
                    print(f"Inserted {insert_count} metrics...")
        
        conn.commit()
        print(f"✓ Successfully inserted {insert_count} step_metrics")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    populate_step_metrics()
