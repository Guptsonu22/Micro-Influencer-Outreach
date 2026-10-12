"""Discovery Run tracking schemas with granular summary metrics."""

from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class DiscoveryRunCreate(BaseModel):
    """Payload to trigger a discovery execution."""
    queries: Optional[List[str]] = Field(
        default_factory=lambda: [
            "AI tools tutorials",
            "Machine learning tutorials",
            "Software development",
            "Programming education",
            "Developer productivity",
            "Generative AI tutorials"
        ],
        description="Search queries to explore for creator channels"
    )
    target_count: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Target number of qualified micro-influencer profiles to discover"
    )
    max_quota_budget: int = Field(
        default=2500,
        ge=100,
        le=10000,
        description="Maximum YouTube API quota units allocated for this discovery run"
    )
    min_subscribers: int = Field(
        default=5000,
        ge=0,
        description="Minimum subscriber threshold for micro-influencer qualification"
    )
    max_subscribers: int = Field(
        default=100000,
        ge=1,
        description="Maximum subscriber threshold for micro-influencer qualification"
    )
    region_code: str = Field(
        default="US",
        description="Two-letter ISO country code for localized YouTube search"
    )
    use_demo_mode: bool = Field(
        default=False,
        description="Explicit demo mode: generates clearly-labeled synthetic records without consuming API quota"
    )


class DiscoverySummary(BaseModel):
    """Transparent summary of discovery execution results and quota metrics."""
    total_search_results: int = 0
    unique_channels_found: int = 0
    qualifying_channels: int = 0
    rejected_channels: int = 0
    quota_units_used: int = 0
    api_requests_count: int = 0
    rejection_breakdown: Dict[str, int] = Field(
        default_factory=lambda: {
            "too_few_subscribers": 0,
            "too_many_subscribers": 0,
            "hidden_subscribers": 0,
            "insufficient_activity": 0
        }
    )
    api_errors: List[str] = Field(default_factory=list)
    continuation_instructions: Optional[str] = None


class DiscoveryRunResponse(BaseModel):
    """Response model for a discovery run."""
    id: str
    status: str = Field(
        ...,
        description="'pending', 'running', 'completed', 'partial', 'quota_exceeded', 'failed'"
    )
    queries: List[str]
    target_count: int
    region_code: str
    source_name: str = "YouTube Data API v3"
    is_demo_run: bool = False
    summary: DiscoverySummary = Field(default_factory=DiscoverySummary)
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
