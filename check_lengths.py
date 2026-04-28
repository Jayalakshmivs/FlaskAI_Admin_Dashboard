import gzip
import re
with gzip.open('datasets/step_metrics.sql.gz', 'rt', encoding='utf-8', errors='replace') as f:
    for line in f:
        # Status is usually the 7th quoted value in the row
        matches = re.findall(r"'([^']+)'", line)
        for m in matches:
            if len(m) > 10 and m.isupper(): # Likely a status like IN_PROGRESS
                print(f"Found long value: {m} ({len(m)} chars)")
