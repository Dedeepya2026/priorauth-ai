#!/bin/sh
# Start FastAPI backend in background
cd /app/backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 &

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    sleep 1
done

# Start Next.js frontend
cd /app/frontend
NODE_ENV=production node server.js
