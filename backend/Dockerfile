FROM python:3.12-slim
WORKDIR /app
RUN pip install uv
COPY pyproject.toml ./
RUN uv pip install --system ".[dev]"
COPY . .
EXPOSE 8011
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8011", "--reload"]
