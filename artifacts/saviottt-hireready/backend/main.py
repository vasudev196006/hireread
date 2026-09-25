import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import validate_environment
from backend.api.career import router as career_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("careercope.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup validation
    logger.info("Initializing CAREERCOPE AI backend...")
    status = validate_environment()
    logger.info("Services status summary: %s", {k: v.get('configured') for k, v in status.items()})
    yield
    logger.info("Shutting down CAREERCOPE AI backend.")

app = FastAPI(
    title="CAREERCOPE AI API",
    description="Evidence-based Career Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
ALLOWED_ORIGINS = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(career_router)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": "CAREERCOPE AI",
        "version": "1.0.0"
    }

# Mount frontend directory for easy single-port access
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def serve_index():
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "CAREERCOPE AI API running. Frontend not found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
