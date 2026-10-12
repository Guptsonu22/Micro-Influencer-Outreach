"""Influencer exploration, filtering, classification, enrichment, and export endpoints."""

import io
import json
from typing import Any, Dict, List, Optional
import pandas as pd
from fastapi import APIRouter, Body, Query, Response, status
from pydantic import BaseModel, Field
from backend.app.core.database import db_manager
from backend.app.core.exceptions import ResourceNotFoundError, AppException
from backend.app.schemas.campaign import FilterCriteria
from backend.app.schemas.common import PaginatedResponse, PaginationParams
from backend.app.schemas.influencer import InfluencerResponse
from backend.app.services.filter_service import filter_service
from backend.app.services.enrichment_service import enrichment_service

router = APIRouter(prefix="/influencers", tags=["Influencer Pipeline, Filtering & Enrichment"])


class ManualContactUpdate(BaseModel):
    contact_email: str = Field(..., description="Manually reviewed public business email")
    source_url: Optional[str] = Field(default=None, description="Public page where email was identified")


class BatchClassificationResponse(BaseModel):
    total_evaluated: int
    passed_count: int
    needs_review_count: int
    failed_count: int
    criterion_pass_counts: Dict[str, int]
    criteria_used: FilterCriteria


@router.get("", response_model=PaginatedResponse[InfluencerResponse])
async def list_influencers(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    decision: Optional[str] = Query(default=None, description="Filter by decision: 'pass', 'fail', or 'needs_review'"),
    is_qualified: Optional[bool] = Query(default=None, description="Filter by qualified boolean"),
    is_synthetic: Optional[bool] = Query(default=None, description="Filter by demo/synthetic flag"),
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

    # Optional in-memory decision filter if decision is explicitly passed
    if decision:
        items = [i for i in items if i.get("classification", {}).get("decision") == decision]
        total = len(items)

    response_items = [InfluencerResponse(**item) for item in items]
    return PaginatedResponse.create(
        items=response_items,
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/export")
async def export_influencers(
    format: str = Query(default="csv", pattern="^(csv|json)$", description="Export format: 'csv' or 'json'"),
    decision: Optional[str] = Query(default=None, description="Filter by decision: 'pass', 'fail', 'needs_review'"),
    is_qualified: Optional[bool] = Query(default=None, description="Optionally export only qualified creators"),
    is_synthetic: Optional[bool] = Query(default=None, description="Filter by real or synthetic data"),
):
    """Exports discovered influencer dataset in CSV or JSON format with full provenance."""
    creators = await db_manager.list_creators(
        is_synthetic=is_synthetic,
        is_qualified=is_qualified,
        skip=0,
        limit=2000,
    )

    if decision:
        creators = [c for c in creators if c.get("classification", {}).get("decision") == decision]

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
            "observation_window": metrics.get("observation_window", "Last 10 public uploads sampled"),
            "contact_email": enrichment.get("contact_email", "Not Found"),
            "email_verification_status": enrichment.get("email_verification_status", "unverified"),
            "email_source": enrichment.get("email_source"),
            "email_source_url": enrichment.get("email_source_url"),
            "audience_demographics": enrichment.get("audience_demographics", "Unavailable"),
            "content_themes": ", ".join(enrichment.get("content_themes", [])),
            "decision": classification.get("decision", "needs_review"),
            "is_qualified": classification.get("is_qualified", False),
            "fit_score": classification.get("fit_score", 0),
            "niche": classification.get("niche", "Technology & Artificial Intelligence"),
            "reasons": " | ".join(classification.get("reasons", [])),
            "niche_status": (classification.get("niche_relevance") or {}).get("status"),
            "follower_status": (classification.get("follower_count") or {}).get("status"),
            "engagement_status": (classification.get("engagement") or {}).get("status"),
            "contact_status": (classification.get("contact_availability") or {}).get("status"),
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


@router.post("/classify", response_model=BatchClassificationResponse)
async def classify_all_influencers(criteria: FilterCriteria = Body(...)):
    """Re-evaluates and classifies all discovered creators against configurable rules.

    - Classifies records as 'pass', 'fail', or 'needs_review'.
    - Stores reasons and separate criterion results.
    - Updates database records in-place without editing source code.
    """
    creators = await db_manager.list_creators(skip=0, limit=2000)

    pass_count = 0
    review_count = 0
    fail_count = 0

    criterion_passes = {
        "niche_relevance": 0,
        "follower_count": 0,
        "engagement": 0,
        "contact_availability": 0
    }

    for creator in creators:
        classification = filter_service.evaluate_influencer(creator, criteria)
        creator["classification"] = classification.model_dump()

        decision = classification.decision
        if decision == "pass":
            pass_count += 1
        elif decision == "needs_review":
            review_count += 1
        else:
            fail_count += 1

        if classification.niche_relevance and classification.niche_relevance.status == "pass":
            criterion_passes["niche_relevance"] += 1
        if classification.follower_count and classification.follower_count.status == "pass":
            criterion_passes["follower_count"] += 1
        if classification.engagement and classification.engagement.status == "pass":
            criterion_passes["engagement"] += 1
        if classification.contact_availability and classification.contact_availability.status == "pass":
            criterion_passes["contact_availability"] += 1

        await db_manager.upsert_creator(creator)

    return BatchClassificationResponse(
        total_evaluated=len(creators),
        passed_count=pass_count,
        needs_review_count=review_count,
        failed_count=fail_count,
        criterion_pass_counts=criterion_passes,
        criteria_used=criteria
    )


@router.post("/{channel_id}/enrich", response_model=InfluencerResponse)
async def enrich_single_influencer(channel_id: str):
    """Executes content theme extraction and public bio scan for a specific creator."""
    creator = await db_manager.get_creator_by_channel_id(channel_id)
    if not creator:
        raise ResourceNotFoundError(resource="Influencer", identifier=channel_id)

    enriched = enrichment_service.enrich_profile(creator)
    # Re-evaluate classification with updated themes/contacts
    classification = filter_service.evaluate_influencer(enriched)
    enriched["classification"] = classification.model_dump()

    await db_manager.upsert_creator(enriched)
    return InfluencerResponse(**enriched)


@router.put("/{channel_id}/contact", response_model=InfluencerResponse)
async def update_contact_email(channel_id: str, payload: ManualContactUpdate):
    """Saves a manually reviewed contact email from a public business-contact page."""
    creator = await db_manager.get_creator_by_channel_id(channel_id)
    if not creator:
        raise ResourceNotFoundError(resource="Influencer", identifier=channel_id)

    if not enrichment_service.is_valid_email_syntax(payload.contact_email):
        raise AppException(
            code="INVALID_EMAIL_SYNTAX",
            message=f"'{payload.contact_email}' is not a valid email address.",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )

    enriched = enrichment_service.enrich_profile(
        creator=creator,
        manual_email=payload.contact_email,
        manual_email_source_url=payload.source_url
    )

    # Re-evaluate classification so contact criterion updates immediately
    classification = filter_service.evaluate_influencer(enriched)
    enriched["classification"] = classification.model_dump()

    await db_manager.upsert_creator(enriched)
    return InfluencerResponse(**enriched)


@router.get("/{channel_id}", response_model=InfluencerResponse)
async def get_influencer_by_channel_id(channel_id: str):
    """Retrieves an influencer's full profile, metrics, reasons, and data provenance."""
    creator = await db_manager.get_creator_by_channel_id(channel_id)
    if not creator:
        raise ResourceNotFoundError(resource="Influencer", identifier=channel_id)
    return InfluencerResponse(**creator)
