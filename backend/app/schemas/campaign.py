"""Campaign configuration and brand context schemas."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str = Field(default="EDXSO Developer Outreach Q4", description="Campaign identifier")
    target_niche: str = Field(default="AI Engineering & Python", description="Target niche")
    min_subscribers: int = Field(default=5_000, ge=0)
    max_subscribers: int = Field(default=100_000, ge=1)
    min_engagement_rate: float = Field(default=2.0, ge=0.0)
    required_keywords: List[str] = Field(
        default_factory=lambda: ["python", "ai", "coding", "software", "tech", "tutorial", "engineer"]
    )
    require_contact_email: bool = Field(default=False)
    brand_name: str = Field(default="EDXSO")
    brand_description: str = Field(
        default="EDXSO builds next-generation AI-powered career training and interactive developer tools."
    )
    offer_details: str = Field(
        default="Paid sponsorship ($250-$800) + free Pro access for the creator's community."
    )
    call_to_action: str = Field(
        default="Reply to this message or book a 10-minute briefing call: cal.com/edxso/partnerships"
    )


class CampaignResponse(CampaignCreate):
    id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
