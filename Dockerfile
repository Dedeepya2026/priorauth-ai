# ── Stage 1: Build the Next.js frontend ──────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./

# Update the next.config.js to proxy to the backend running on the same container
RUN echo '/** @type {import("next").NextConfig} */\n\
const nextConfig = {\n\
    output: "standalone",\n\
    async rewrites() {\n\
        return [\n\
            {\n\
                source: "/api/:path*",\n\
                destination: "http://127.0.0.1:8000/api/:path*",\n\
            },\n\
        ];\n\
    },\n\
};\n\
module.exports = nextConfig;' > next.config.js

RUN npm run build

# ── Stage 2: Production image ────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Install Node.js for Next.js standalone server
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy Next.js standalone build
COPY --from=frontend-build /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-build /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-build /app/frontend/public ./frontend/public 2>/dev/null || true

# Seed the database
RUN cd backend && python seed.py

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
