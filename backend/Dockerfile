FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Bake dataset SQL files into the image so Coolify deployments
# always have data even without Git LFS support.
# Includes compressed .gz files (18MB vs 131MB original)
COPY datasets/ /app/datasets/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
