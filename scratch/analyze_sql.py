import re

def analyze_files():
    try:
        with open('datasets/files.sql', 'r', encoding='utf-8') as f:
            content = f.read()
            # Match (id, name, type, source, source_id, ...)
            matches = re.findall(r"\('[^']+',\s*'[^']+',\s*'[^']+',\s*'([^']+)',\s*'([^']+)'", content)
            print(f"Total records: {len(matches)}")
            sources = set(matches)
            print("Distinct (source, source_id) pairs:")
            for s, sid in sorted(sources):
                count = sum(1 for m_s, m_sid in matches if m_s == s and m_sid == sid)
                print(f"  source='{s}', source_id='{sid}' -> {count} records")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_files()
