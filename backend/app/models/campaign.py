"""Pydantic models for Campaign rules, filter thresholds, and discovery parameters."""

from typing import List, Optional
from pydantic import BaseModel, Field


class FilterCriteria(BaseModel):
    """Configurable brand-fit filter rules for classifying micro-influencers."""
    min_subscribers: int = Field(
        default=5_000,
        ge=0,
        description="Minimum subscriber threshold for micro-influencer tier."
    )
    max_subscribers: int = Field(
        default=100_000,
        ge=1,
        description="Maximum subscriber threshold for micro-influencer tier."
    )
    min_engagement_rate: float = Field(
        default=2.0,
        ge=0.0,
        description="Minimum required estimated engagement rate percentage."
    )
    target_niches: List[str] = Field(
        default_factory=lambda: [
            "AI Engineering",
            "Python Development",
            "Machine Learning",
            "Web Development",
            "Tech Careers",
            "EdTech & Coding"
        ],
        description="Target content verticals."
    )
    required_keywords: List[str] = Field(
        default_factory=lambda: ["python", "ai", "coding", "software", "tech", "tutorial", "engineer"],
        description="Keywords that should appear in channel bio, title, or recent videos."
    )
    require_contact_email: bool = Field(
        default=False,
        description="Whether having a discoverable email is mandatory for qualification."
    )


class DiscoveryRequest(BaseModel):
    """Request payload to discover creators on YouTube."""
    query: str = Field(
        default="AI programming tutorial Python",
        description="Search keyword to discover YouTube creators."
    )
    target_count: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Number of creators to discover."
    )
    region_code: Optional[str] = Field(
        default="US",
        description="Optional country region filter."
    )
    use_demo_mode: bool = Field(
        default=False,
        description="If True, loads clearly-labeled synthetic records without using YouTube API."
    )


class CampaignProfile(BaseModel):
    """Brand pitch context used for LLM personalized copy generation."""
    brand_name: str = Field(
        default="EDXSO",
        description="Company / Brand name."
    )
    brand_description: str = Field(
        default="EDXSO builds next-generation AI-powered career training and interactive developer tools.",
        description="Brand identity and mission statement."
    )
    offer_details: str = Field(
        default="Paid sponsorship ($250-$800) + free Pro access for the creator's community to trial our developer workbench.",
        description="Collaboration incentive and compensation structure."
    )
    call_to_action: str = Field(
        default="Reply to this message or book a 10-minute briefing call: cal.com/edxso/partnerships",
        description="Specific next step requested from creator."
    )
