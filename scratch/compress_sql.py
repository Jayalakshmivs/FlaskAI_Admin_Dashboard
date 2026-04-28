import gzip
import shutil
import os

src = "datasets/step_metrics.sql"
dst = "datasets/step_metrics.sql.gz"

with open(src, "rb") as f_in:
    with gzip.open(dst, "wb", compresslevel=6) as f_out:
        shutil.copyfileobj(f_in, f_out)

orig = os.path.getsize(src) / 1024 / 1024
comp = os.path.getsize(dst) / 1024 / 1024
print(f"Original: {orig:.1f}MB")
print(f"Compressed: {comp:.1f}MB")
print(f"Ratio: {comp/orig*100:.0f}%")
