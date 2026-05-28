# ── Stage: development ────────────────────────────────────────────────────────
FROM python:3.12-slim AS development

WORKDIR /app

RUN pip install uv

COPY pyproject.toml ./
RUN uv pip install --system ".[dev]"

COPY . .

EXPOSE 8011
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8011", "--reload"]

# ── Stage: production ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS production

RUN addgroup --system app && adduser --system --ingroup app app

WORKDIR /app

RUN pip install uv

COPY pyproject.toml ./
RUN --mount=type=cache,target=/root/.cache uv pip install --system "."

COPY . .
RUN chown -R app:app /app
USER app

CMD ["sh", "start.sh"]
