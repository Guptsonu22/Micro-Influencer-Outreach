"""Generated outreach copy schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class GeneratedMessageCreate(BaseModel):
    creator_id: str
    channel_id: str
    campaign_id: Optional[str] = None
    email_subject: str
    email_body: str
    instagram_dm: str
    model_name: str = "gemini-1.5-flash"


class GeneratedMessageResponse(GeneratedMessageCreate):
    id: str
    status: str = Field(default="draft", description="'draft', 'approved', 'rejected'")
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
