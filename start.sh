#!/bin/bash
set -e

echo "[AppRunner] Starting PriorAuth AI..."
echo "[AppRunner] Working directory: $(pwd)"
echo "[AppRunner] Python version: $(python3 --version)"

# Navigate to backend
cd backend

# Seed the database (ignore errors if already seeded)
echo "[AppRunner] Seeding database..."
python3 seed.py || echo "[AppRunner] Seed script completed with warnings (may already be seeded)"

echo "[AppRunner] Starting uvicorn server..."
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
