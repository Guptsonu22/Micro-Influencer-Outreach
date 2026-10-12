"""FastAPI application entrypoint for EDXSO AI Influencer Outreach System."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import db_manager
from backend.app.api.v1.router import api_v1_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("edxso.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events for the application."""
    logger.info("Initializing %s...", settings.PROJECT_NAME)
    connected = await db_manager.connect_to_database()
    if connected:
        logger.info("Database initialized successfully with MongoDB.")
    else:
        logger.info("Database initialized with in-memory persistence adapter.")
    yield
    logger.info("Shutting down %s...", settings.PROJECT_NAME)
    await db_manager.close_database_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Production-quality API for automated discovery, qualification, "
        "enrichment, and personalized outreach to YouTube micro-influencers."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """Root redirect / information endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
