"""Generated outreach copy schemas with source context."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class GeneratedMessageCreate(BaseModel):
    creator_id: str = Field(..., description="Internal creator identifier")
    channel_id: str = Field(..., description="YouTube channel identifier")
    campaign_id: Optional[str] = Field(default=None, description="Campaign reference")
    source_url: Optional[str] = Field(default=None, description="Creator source channel URL")
    email_subject: str = Field(..., description="Personalized email subject")
    email_body: str = Field(..., description="Personalized email body text")
    instagram_dm: str = Field(..., description="Platform-compliant Instagram DM copy draft")
    model_name: str = Field(default="gemini-1.5-flash", description="LLM used for generation")


class GeneratedMessageResponse(GeneratedMessageCreate):
    id: str
    status: str = Field(default="draft", description="'draft', 'approved', 'rejected'")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
