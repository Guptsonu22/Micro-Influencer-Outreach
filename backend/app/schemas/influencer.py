"""Influencer/Creator domain schemas with data provenance and integrity rules."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InfluencerMetricsSchema(BaseModel):
    """Source-backed metrics with formula transparency."""
    subscriber_count: Optional[int] = Field(
        default=None,
        description="Public subscriber count from YouTube API. None if hidden."
    )
    is_subscriber_count_hidden: bool = Field(
        default=False,
        description="True if subscriber count is explicitly hidden by creator."
    )
    video_count: Optional[int] = Field(default=None)
    view_count: Optional[int] = Field(default=None)
    recent_video_sample_size: int = Field(default=0)
    avg_recent_views: Optional[float] = Field(default=None)
    avg_recent_likes: Optional[float] = Field(default=None)
    avg_recent_comments: Optional[float] = Field(default=None)
    estimated_engagement_rate: Optional[float] = Field(
        default=None,
        description="Estimated engagement rate. None if view count is 0 or insufficient data."
    )
    engagement_formula_used: str = Field(
        default="((avg_likes + avg_comments) / avg_views) * 100",
        description="Explicit documentation of engagement formula."
    )
    metric_timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when public stats were collected."
    )


class InfluencerEnrichmentSchema(BaseModel):
    """Enriched creator contact and content attributes."""
    contact_email: str = Field(
        default="Not Found",
        description="Discovered public contact email. Strictly 'Not Found' if missing."
    )
    email_source: str = Field(
        default="channel_description_or_links",
        description="Source where email was identified."
    )
    social_links: Dict[str, str] = Field(default_factory=dict)
    content_themes: List[str] = Field(default_factory=list)
    recent_video_titles: List[str] = Field(default_factory=list)
    audience_demographics: str = Field(
        default="Unavailable",
        description="YouTube Data API does not expose third-party demographic data publicly."
    )
    enriched_at: Optional[datetime] = None


class InfluencerClassificationSchema(BaseModel):
    """Brand-fit qualification result."""
    is_qualified: bool = False
    fit_score: int = Field(default=0, ge=0, le=100)
    niche: str = "Unknown"
    reasons: List[str] = Field(default_factory=list)
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)


class InfluencerBase(BaseModel):
    channel_id: str
    title: str
    custom_url: Optional[str] = "Unavailable"
    channel_url: str
    description: str = ""
    published_at: Optional[str] = "Unknown"
    country: Optional[str] = "Unknown"
    thumbnail_url: Optional[str] = None


class InfluencerCreate(InfluencerBase):
    metrics: InfluencerMetricsSchema = Field(default_factory=InfluencerMetricsSchema)
    enrichment: InfluencerEnrichmentSchema = Field(default_factory=InfluencerEnrichmentSchema)
    classification: InfluencerClassificationSchema = Field(default_factory=InfluencerClassificationSchema)
    is_synthetic: bool = False
    source_api: str = "YouTube Data API v3"


class InfluencerResponse(InfluencerBase):
    id: Optional[str] = None
    metrics: InfluencerMetricsSchema
    enrichment: InfluencerEnrichmentSchema
    classification: InfluencerClassificationSchema
    is_synthetic: bool
    source_api: str
    retrieved_at: datetime
    updated_at: datetime
