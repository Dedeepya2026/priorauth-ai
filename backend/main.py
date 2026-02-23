import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
@app.get("/")
def root():
    return {"name": settings.APP_NAME, "status": "running", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "healthy", "app": settings.APP_NAME, "version": "1.0.0"}
