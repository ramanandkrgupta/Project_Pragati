#!/bin/bash
source venv/bin/activate
echo "Starting FastAPI server on http://127.0.0.1:8000..."
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
