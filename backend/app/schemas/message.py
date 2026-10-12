"""Generated outreach copy schemas with provenance, word counts, and review flags."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GenerateMessageRequest(BaseModel):
    creator_id: Optional[str] = Field(default=None, description="Optional database creator identifier")
    channel_id: str = Field(..., description="YouTube channel identifier")
    campaign_id: Optional[str] = Field(default=None, description="Campaign reference")
    allow_ineligible_override: bool = Field(
        default=False,
        description="Must be explicitly True to generate copy for an ineligible/failed creator"
    )
    force_mock: bool = Field(
        default=False,
        description="Force use of Mock LLM provider for deterministic offline testing"
    )


class EditMessageRequest(BaseModel):
    email_subject: Optional[str] = Field(default=None, description="Updated email subject")
    email_body: Optional[str] = Field(default=None, description="Updated email body copy")
    instagram_dm: Optional[str] = Field(default=None, description="Updated Instagram DM draft")
    status: Optional[str] = Field(default=None, description="'draft', 'approved', or 'rejected'")


class GeneratedMessageCreate(BaseModel):
    creator_id: str
    channel_id: str
    campaign_id: Optional[str] = None
    email_subject: str
    email_body: str
    instagram_dm: str
    personalization_evidence: Dict[str, Any] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)
    email_word_count: int = Field(default=0, description="Word count for email body (Target: 60-90 words)")
    dm_word_count: int = Field(default=0, description="Word count for Instagram DM (Target: 15-30 words)")
    model_name: str = "gemini-2.5-flash"
    provider_name: str = "gemini"
    is_mock: bool = False
    prompt_version: str = "v1.2.0-strict-safety"
    status: str = Field(default="draft", description="'draft', 'approved', 'rejected'")


class GeneratedMessageResponse(GeneratedMessageCreate):
    id: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
