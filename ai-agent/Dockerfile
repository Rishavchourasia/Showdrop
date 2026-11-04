# Python service image. uv installs the exact versions pinned in uv.lock.
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.8.17 /uv /usr/local/bin/uv
WORKDIR /app

# Dependencies first (cached layer), then code -- same trick as the Java Dockerfile.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Bake the embedding model into the image so containers start fast and work offline.
ENV EMBEDDING_CACHE_DIR=/models
RUN uv run --no-sync python -c "from fastembed import TextEmbedding; TextEmbedding('BAAI/bge-small-en-v1.5', cache_dir='/models')"

COPY app ./app
COPY knowledge ./knowledge

RUN useradd --create-home app && chown -R app /models
USER app

EXPOSE 8000
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
