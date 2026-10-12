"""Influencer domain schemas with strict provenance, missing-value preservation, and no email guessing."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class InfluencerMetricsSchema(BaseModel):
    """Source-backed metrics with formula transparency. Distinguishes 0 from None."""
    subscriber_count: Optional[int] = Field(
        default=None,
        description="Public subscriber count. None if hidden or missing, distinguished from 0."
    )
    is_subscriber_count_hidden: bool = Field(
        default=False,
        description="True if subscriber count is explicitly hidden by creator."
    )
    video_count: Optional[int] = Field(
        default=None,
        description="Total public video uploads. None if missing, distinguished from 0."
    )
    view_count: Optional[int] = Field(
        default=None,
        description="Lifetime cumulative channel views. None if missing, distinguished from 0."
    )
    recent_video_sample_size: int = Field(
        default=0,
        description="Number of recent videos sampled to estimate engagement."
    )
    avg_recent_views: Optional[float] = Field(
        default=None,
        description="Average views across sampled videos. None if no videos."
    )
    avg_recent_likes: Optional[float] = Field(
        default=None,
        description="Average likes across sampled videos."
    )
    avg_recent_comments: Optional[float] = Field(
        default=None,
        description="Average comments across sampled videos."
    )
    estimated_engagement_rate: Optional[float] = Field(
        default=None,
        description="Calculated engagement rate percentage. None if views are 0 or unavailable."
    )
    engagement_formula_used: str = Field(
        default="((avg_likes + avg_comments) / avg_views) * 100",
        description="Explicit formula documentation for how engagement was calculated."
    )
    metric_timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp when metrics were collected."
    )


class InfluencerEnrichmentSchema(BaseModel):
    """Enriched creator details including public contact email and content themes."""
    contact_email: str = Field(
        default="Not Found",
        description="Discovered public contact email. Strictly 'Not Found' if missing. Never guessed."
    )
    email_source: str = Field(
        default="channel_description_or_links",
        description="Source where email was identified."
    )
    social_links: Dict[str, str] = Field(
        default_factory=dict,
        description="Verified links to external profiles (Instagram, X, LinkedIn, etc.)."
    )
    content_themes: List[str] = Field(
        default_factory=list,
        description="Keywords and topics representing creator's core content niche."
    )
    recent_video_titles: List[str] = Field(
        default_factory=list,
        description="Sample of real recent video titles published by creator."
    )
    audience_demographics: str = Field(
        default="Unavailable",
        description="YouTube Data API does not expose third-party demographic data publicly."
    )
    enriched_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when enrichment ran."
    )

    @field_validator("contact_email")
    @classmethod
    def validate_no_guessed_email(cls, v: str) -> str:
        # Guarantee no empty strings or guessed placeholder emails pass through
        if not v or v.strip().lower() in ["", "none", "null", "unknown", "n/a"]:
            return "Not Found"
        return v.strip()


class InfluencerClassificationSchema(BaseModel):
    """Qualification and brand-fit decision with granular reasons."""
    is_qualified: bool = Field(
        default=False,
        description="Whether creator satisfies all brand-fit filter rules."
    )
    fit_score: int = Field(
        default=0,
        ge=0,
        le=100,
        description="Calculated fit score between 0 and 100."
    )
    niche: str = Field(
        default="Unknown",
        description="Content vertical classification."
    )
    reasons: List[str] = Field(
        default_factory=list,
        description="Transparent breakdown of qualification or rejection reasons."
    )
    evaluated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when evaluation was executed."
    )


class InfluencerBase(BaseModel):
    channel_id: str = Field(..., description="Unique YouTube Channel ID (e.g. UCxxxxxxxx)")
    title: str = Field(..., description="Channel display name")
    custom_url: Optional[str] = Field(default="Unavailable", description="Vanity handle e.g. @devchannel")
    channel_url: str = Field(..., description="Canonical channel URL")
    source_url: Optional[str] = Field(default=None, description="Direct URL to source profile")
    source_name: str = Field(default="YouTube Data API v3", description="Origin data source")
    description: str = Field(default="", description="Channel bio / description")
    published_at: Optional[str] = Field(default="Unknown", description="Channel creation date")
    country: Optional[str] = Field(default="Unknown", description="Country code")
    thumbnail_url: Optional[str] = Field(default=None, description="Avatar thumbnail URL")

    def model_post_init(self, __context: Any) -> None:
        if self.source_url is None:
            self.source_url = self.channel_url


class InfluencerCreate(InfluencerBase):
    metrics: InfluencerMetricsSchema = Field(default_factory=InfluencerMetricsSchema)
    enrichment: InfluencerEnrichmentSchema = Field(default_factory=InfluencerEnrichmentSchema)
    classification: InfluencerClassificationSchema = Field(default_factory=InfluencerClassificationSchema)
    is_synthetic: bool = Field(default=False, description="True ONLY for demo records")
    collected_at: datetime = Field(default_factory=datetime.utcnow, description="Collection timestamp")
    retrieved_at: datetime = Field(default_factory=datetime.utcnow, description="Retrieval timestamp")


class InfluencerResponse(InfluencerBase):
    id: Optional[str] = None
    metrics: InfluencerMetricsSchema
    enrichment: InfluencerEnrichmentSchema
    classification: InfluencerClassificationSchema
    is_synthetic: bool
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
