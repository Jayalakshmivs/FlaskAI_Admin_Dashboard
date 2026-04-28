import re

def count_sql_rows(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find everything matching ('...',
            matches = re.findall(r"\('[^']+',", content)
            return len(matches)
    except Exception as e:
        return f"Error: {e}"

if __name__ == "__main__":
    print(f"Users: {count_sql_rows('datasets/users.sql')}")
    print(f"Jobs: {count_sql_rows('datasets/jobs.sql')}")
    print(f"Files: {count_sql_rows('datasets/files.sql')}")
    print(f"Metrics: {count_sql_rows('datasets/step_metrics.sql')}")
