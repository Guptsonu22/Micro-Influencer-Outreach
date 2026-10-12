"""Influencer / Creator CRUD, filtering, and pagination endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from backend.app.core.database import db_manager
from backend.app.core.exceptions import ResourceNotFoundError
from backend.app.schemas.common import PaginatedResponse, PaginationParams, InfluencerFilterParams
from backend.app.schemas.influencer import InfluencerCreate, InfluencerResponse

router = APIRouter(prefix="/creators", tags=["Influencer Profiles"])


@router.get("", response_model=PaginatedResponse[InfluencerResponse])
async def list_creators(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    is_qualified: Optional[bool] = Query(default=None, description="Filter by qualified status"),
    is_synthetic: Optional[bool] = Query(default=None, description="Filter by demo/synthetic flag"),
    min_subscribers: Optional[int] = Query(default=None, ge=0, description="Min subscribers"),
    max_subscribers: Optional[int] = Query(default=None, ge=0, description="Max subscribers"),
    search_query: Optional[str] = Query(default=None, description="Search by name, handle, or bio"),
    niche: Optional[str] = Query(default=None, description="Filter by niche category"),
):
    """Retrieves paginated influencer profiles with comprehensive filters."""
    pagination = PaginationParams(page=page, page_size=page_size)

    total = await db_manager.count_creators(
        is_synthetic=is_synthetic,
        is_qualified=is_qualified,
        min_subscribers=min_subscribers,
        max_subscribers=max_subscribers,
        search_query=search_query,
        niche=niche,
    )

    items = await db_manager.list_creators(
        is_synthetic=is_synthetic,
        is_qualified=is_qualified,
        min_subscribers=min_subscribers,
        max_subscribers=max_subscribers,
        search_query=search_query,
        niche=niche,
        skip=pagination.skip,
        limit=pagination.page_size,
    )

    # Cast to InfluencerResponse schemas
    response_items = [InfluencerResponse(**item) for item in items]
    return PaginatedResponse.create(
        items=response_items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{channel_id}", response_model=InfluencerResponse)
async def get_creator(channel_id: str):
    """Retrieves a single creator profile by YouTube channel ID."""
    creator = await db_manager.get_creator_by_channel_id(channel_id)
    if not creator:
        raise ResourceNotFoundError(resource="Influencer", identifier=channel_id)
    return InfluencerResponse(**creator)


@router.post("", response_model=InfluencerResponse, status_code=status.HTTP_201_CREATED)
async def upsert_creator(payload: InfluencerCreate):
    """Creates or updates an influencer profile document."""
    data = payload.model_dump()
    await db_manager.upsert_creator(data)
    saved = await db_manager.get_creator_by_channel_id(payload.channel_id)
    return InfluencerResponse(**saved)
