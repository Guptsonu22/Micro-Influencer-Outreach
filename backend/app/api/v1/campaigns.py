"""Campaign profile configuration endpoints."""

import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Query, status
from backend.app.core.database import db_manager
from backend.app.core.exceptions import ResourceNotFoundError
from backend.app.schemas.campaign import CampaignCreate, CampaignResponse

router = APIRouter(prefix="/campaigns", tags=["Campaigns & Brand Context"])


@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(payload: CampaignCreate):
    """Creates a new campaign with brand guidelines and qualification rules."""
    campaign_id = f"camp_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()
    campaign_data = payload.model_dump()
    campaign_data["id"] = campaign_id
    campaign_data["created_at"] = now
    campaign_data["updated_at"] = now

    await db_manager.save_campaign(campaign_data)
    return CampaignResponse(**campaign_data)


@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    limit: int = Query(default=20, ge=1, le=100, description="Max campaigns to return")
):
    """Lists saved campaigns."""
    campaigns = await db_manager.list_campaigns(limit=limit)
    return [CampaignResponse(**camp) for camp in campaigns]


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str):
    """Retrieves a single campaign profile."""
    campaign = await db_manager.get_campaign(campaign_id)
    if not campaign:
        raise ResourceNotFoundError(resource="Campaign", identifier=campaign_id)
    return CampaignResponse(**campaign)
