"""Influencer exploration and CSV/JSON dataset export endpoints."""

import io
import json
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Query, Response, status
from fastapi.responses import StreamingResponse
from backend.app.core.database import db_manager
from backend.app.core.exceptions import ResourceNotFoundError, AppException
from backend.app.schemas.common import PaginatedResponse, PaginationParams
from backend.app.schemas.influencer import InfluencerResponse

router = APIRouter(prefix="/influencers", tags=["Influencer Discovery & Export"])


@router.get("", response_model=PaginatedResponse[InfluencerResponse])
async def list_influencers(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    is_qualified: Optional[bool] = Query(default=None, description="Filter by qualification status"),
    is_synthetic: Optional[bool] = Query(default=None, description="Filter by synthetic demo flag"),
    min_subscribers: Optional[int] = Query(default=None, ge=0),
    max_subscribers: Optional[int] = Query(default=None, ge=0),
    search_query: Optional[str] = Query(default=None, description="Search by name, handle, or bio"),
    niche: Optional[str] = Query(default=None, description="Filter by content niche"),
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

    response_items = [InfluencerResponse(**item) for item in items]
    return PaginatedResponse.create(
        items=response_items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/export")
async def export_influencers(
    format: str = Query(default="csv", regex="^(csv|json)$", description="Export format: 'csv' or 'json'"),
    is_qualified: Optional[bool] = Query(default=None, description="Optionally export only qualified creators"),
    is_synthetic: Optional[bool] = Query(default=None, description="Filter by real or synthetic data"),
):
    """Exports discovered influencer dataset in CSV or JSON format with full provenance."""
    # Retrieve all matching creators (up to 1,000)
    creators = await db_manager.list_creators(
        is_synthetic=is_synthetic,
        is_qualified=is_qualified,
        skip=0,
        limit=1000,
    )

    if format == "json":
        json_content = json.dumps(creators, default=str, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=edxso_influencers_export.json"}
        )

    # Flatten nested dictionaries for tabular CSV export
    flat_rows = []
    for c in creators:
        metrics = c.get("metrics", {})
        enrichment = c.get("enrichment", {})
        classification = c.get("classification", {})
        outreach = c.get("outreach", {})

        flat_rows.append({
            "channel_id": c.get("channel_id"),
            "title": c.get("title"),
            "custom_url": c.get("custom_url"),
            "channel_url": c.get("channel_url"),
            "source_url": c.get("source_url"),
            "source_name": c.get("source_name", "YouTube Data API v3"),
            "country": c.get("country"),
            "subscriber_count": metrics.get("subscriber_count"),
            "is_subscriber_count_hidden": metrics.get("is_subscriber_count_hidden", False),
            "video_count": metrics.get("video_count"),
            "view_count": metrics.get("view_count"),
            "avg_recent_views": metrics.get("avg_recent_views"),
            "avg_recent_likes": metrics.get("avg_recent_likes"),
            "avg_recent_comments": metrics.get("avg_recent_comments"),
            "estimated_engagement_rate": metrics.get("estimated_engagement_rate"),
            "engagement_formula_used": metrics.get("engagement_formula_used"),
            "contact_email": enrichment.get("contact_email", "Not Found"),
            "email_source": enrichment.get("email_source"),
            "audience_demographics": enrichment.get("audience_demographics", "Unavailable"),
            "content_themes": ", ".join(enrichment.get("content_themes", [])),
            "is_qualified": classification.get("is_qualified", False),
            "fit_score": classification.get("fit_score", 0),
            "niche": classification.get("niche", "Unknown"),
            "reasons": " | ".join(classification.get("reasons", [])),
            "outreach_status": outreach.get("status", "draft"),
            "is_synthetic": c.get("is_synthetic", False),
            "retrieved_at": c.get("retrieved_at"),
            "metric_timestamp": metrics.get("metric_timestamp")
        })

    df = pd.DataFrame(flat_rows)
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_content = csv_buffer.getvalue()

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=edxso_influencers_export.csv"}
    )


@router.get("/{channel_id}", response_model=InfluencerResponse)
async def get_influencer_by_channel_id(channel_id: str):
    """Retrieves a single influencer profile by YouTube channel ID."""
    creator = await db_manager.get_creator_by_channel_id(channel_id)
    if not creator:
        raise ResourceNotFoundError(resource="Influencer", identifier=channel_id)
    return InfluencerResponse(**creator)
