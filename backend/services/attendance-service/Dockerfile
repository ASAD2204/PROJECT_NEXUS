FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (minimal)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq-dev libgl1 libglib2.0-0 git && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install pre-compiled binaries and models to skip heavy C++ compilation
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefer-binary dlib-bin && \
    pip install --no-cache-dir --no-deps face-recognition && \
    pip install --no-cache-dir face-recognition-models && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
