FROM python:3.12-slim

WORKDIR /app

# System deps for pdfplumber / psycopg2 are covered by the slim image + wheels.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Run from the import root so `import db.postgres`, `import ml.trainer`, etc. resolve.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
