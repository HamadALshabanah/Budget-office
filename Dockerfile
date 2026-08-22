# Backend — FastAPI + SQLite
FROM python:3.12-slim

WORKDIR /app

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy dependency manifests first (better layer caching)
COPY pyproject.toml uv.lock* ./

# Install dependencies into system python
RUN uv pip install --system --no-cache -r pyproject.toml

# Copy application code (app/ package + root modules it imports)
COPY app ./app
COPY main.py models.py schema.py user_session.py seed_db.py migrate_categories.py ./

# Secrets come from compose env_file, never baked into the image

# SQLite DB lives in a volume so it survives container restarts
VOLUME ["/data"]
ENV SQLITE_PATH=/data/invoices.db

EXPOSE 8000

# Seed is optional: run `docker compose exec backend uv run python seed_db.py`
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
