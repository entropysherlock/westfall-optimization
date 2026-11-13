# Westfall Optimization job service. Build from the repository root:
#   docker build -f service/Dockerfile -t westfall-service .
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
COPY service ./service
RUN pip install . ./service && useradd --create-home --uid 10001 westfall
USER westfall
EXPOSE 8000
# One server process: the job queue lives in memory (see service/README.md).
CMD ["uvicorn", "westfall_service.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers"]
