import os
import psycopg2
import re

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/flaskai")
SQL_FILE = "/app/datasets/step_metrics.sql"

def split_values(values_str):
    """Very basic split of (val1, val2), (val3, val4) into individual rows."""
    # We look for '), (' while NOT inside a single-quoted string.
    # This is a bit complex for a regex, so we'll do a character-by-character scan.
    rows = []
    current_row = []
    in_string = False
    escaped = False
    depth = 0
    
    for i, char in enumerate(values_str):
        if escaped:
            current_row.append(char)
            escaped = False
            continue
        
        if char == "'":
            in_string = not in_string
            current_row.append(char)
        elif char == "\\" and in_string:
            escaped = True
            current_row.append(char)
        elif not in_string:
            if char == '(':
                depth += 1
                current_row.append(char)
            elif char == ')':
                depth -= 1
                current_row.append(char)
                if depth == 0:
                    # Found end of a row
                    rows.append("".join(current_row).strip())
                    current_row = []
            elif char == ',' and depth == 0:
                # separator between rows, skip
                continue
            else:
                current_row.append(char)
        else:
            current_row.append(char)
            
    return rows

def seed():
    print(f"Starting advanced seed from {SQL_FILE}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    success_count = 0
    error_count = 0
    
    buffer = []
    
    with open(SQL_FILE, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("--"):
                continue
            
            buffer.append(line)
            
            if line.endswith(";"):
                statement = " ".join(buffer)
                buffer = []
                
                if "INSERT INTO" in statement.upper():
                    # Extract header and values
                    try:
                        # Find where VALUES starts
                        # Match case-insensitive
                        match = re.search(r"VALUES", statement, re.IGNORECASE)
                        if not match: continue
                        
                        header = statement[:match.start()].strip()
                        # Standardize table name in header
                        header = header.replace('"pipeline_step_metrics"', '"step_metrics"')
                        
                        values_part = statement[match.end():].strip()
                        if values_part.endswith(";"): values_part = values_part[:-1]
                        
                        rows = split_values(values_part)
                        
                        for row in rows:
                            try:
                                individual_insert = f"{header} VALUES {row}"
                                cur.execute(individual_insert)
                                success_count += 1
                                if success_count % 1000 == 0:
                                    print(f"Inserted {success_count} rows...")
                            except Exception:
                                error_count += 1
                                continue
                    except Exception as e:
                        print(f"Failed to process statement: {e}")
                        continue
                else:
                    # execute simple statements (ALTER, etc.)
                    try:
                        cur.execute(statement)
                    except:
                        pass
                
    print(f"Seed finished. Total Success: {success_count}, Total Errors: {error_count}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
