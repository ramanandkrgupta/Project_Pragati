FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy API and resources from the root context
COPY api/ /app/api/
COPY output/ /app/output/
COPY ml_pipeline/ /app/ml_pipeline/
# If paimana.db doesn't exist, this step might fail. 
# We can touch it or just COPY it explicitly since we know it exists.
COPY paimana.db /app/

ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
