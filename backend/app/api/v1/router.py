"""Centralized API v1 router hub assembling all feature routers."""

from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.creators import router as creators_router
from backend.app.api.v1.influencers import router as influencers_router
from backend.app.api.v1.discovery import router as discovery_router
from backend.app.api.v1.campaigns import router as campaigns_router
from backend.app.api.v1.messages import router as messages_router
from backend.app.api.v1.outreach import router as outreach_router

api_v1_router = APIRouter()

# Mount feature routers
api_v1_router.include_router(health_router)
api_v1_router.include_router(influencers_router)
api_v1_router.include_router(creators_router)
api_v1_router.include_router(discovery_router)
api_v1_router.include_router(campaigns_router)
api_v1_router.include_router(messages_router)
api_v1_router.include_router(outreach_router)
