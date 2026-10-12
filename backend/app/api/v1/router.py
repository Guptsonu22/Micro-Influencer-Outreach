"""Centralized API v1 router hub."""

from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router

api_v1_router = APIRouter()

# Mount feature routers
api_v1_router.include_router(health_router)
