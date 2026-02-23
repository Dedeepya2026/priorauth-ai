#!/bin/bash
set -e

echo "[AppRunner] Starting PriorAuth AI..."
echo "[AppRunner] Working directory: $(pwd)"

# Navigate to backend directory and start the API
cd backend

# Seed the database (ignore errors if already seeded)
echo "[AppRunner] Seeding database..."
python3 seed.py 2>&1 || echo "[AppRunner] Seed completed with warnings"

# Start the FastAPI backend on port 8080
echo "[AppRunner] Starting uvicorn server on port 8080..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8080
