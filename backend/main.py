import logging
import traceback
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from config import settings
from database import engine, Base
from routers import auth, documents, pa_requests, clinical_notes, analytics

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("priorauth")

# ── Database ─────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── App ──────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered Prior Authorization & Clinical Documentation Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    redirect_slashes=False,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global Error Handlers ────────────────────────────────
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Catch Pydantic validation errors and return structured 422 response."""
    errors = []
    for err in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in err["loc"]),
            "message": err["msg"],
            "type": err["type"],
        })
    logger.warning(f"Validation error on {request.method} {request.url.path}: {errors}")
    return JSONResponse(status_code=422, content={"detail": "Validation failed", "errors": errors})


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    logger.warning(f"Value error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions — returns safe 500 response."""
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# ── Request logging middleware ───────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"--> {request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"<-- {request.method} {request.url.path} {response.status_code}")
    return response


# ── Register Routers ─────────────────────────────────────
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(pa_requests.router)
app.include_router(clinical_notes.router)
app.include_router(analytics.router)


# ── Health / Root ────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "healthy", "app": settings.APP_NAME, "version": "1.0.0"}


# ── Serve Static Frontend ───────────────────────────────
# The Next.js static export goes to ../frontend/out/
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "out")
# Also check for a relative path from the working directory
if not os.path.isdir(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")
if not os.path.isdir(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(os.getcwd(), "..", "frontend", "out")
if not os.path.isdir(FRONTEND_DIR):
    FRONTEND_DIR = os.path.join(os.getcwd(), "frontend", "out")

logger.info(f"Frontend directory: {FRONTEND_DIR} (exists: {os.path.isdir(FRONTEND_DIR)})")

# Mount Next.js static assets if the build output exists
if os.path.isdir(FRONTEND_DIR):
    # Mount _next directory for JS/CSS assets
    next_static = os.path.join(FRONTEND_DIR, "_next")
    if os.path.isdir(next_static):
        app.mount("/_next", StaticFiles(directory=next_static), name="next_static")

    # Serve frontend pages as catch-all
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve static frontend pages. API routes are handled by routers above."""
        # Skip API routes (already handled by routers)
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        # Try to find the exact file
        file_path = os.path.join(FRONTEND_DIR, full_path)

        # If path ends with /, look for index.html in that directory
        if full_path == "" or full_path.endswith("/"):
            index_path = os.path.join(FRONTEND_DIR, full_path, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path, media_type="text/html")

        # If it's a directory, look for index.html inside
        if os.path.isdir(file_path):
            index_path = os.path.join(file_path, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path, media_type="text/html")

        # Try adding .html extension
        html_path = file_path + ".html"
        if os.path.isfile(html_path):
            return FileResponse(html_path, media_type="text/html")

        # Try as an exact file (for images, fonts, etc.)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        # For SPA-like behavior, serve the root index.html for unknown paths
        root_index = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(root_index):
            return FileResponse(root_index, media_type="text/html")

        return JSONResponse(status_code=404, content={"detail": "Page not found"})
else:
    @app.get("/")
    def root():
        return {"name": settings.APP_NAME, "status": "running", "version": "1.0.0", "note": "Frontend not built. Visit /docs for API documentation."}

