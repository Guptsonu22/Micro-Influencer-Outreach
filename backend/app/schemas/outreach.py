"""Outreach execution and audit log schemas with duplicate tracking metadata."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class OutreachLogCreate(BaseModel):
    creator_id: str = Field(..., description="Creator reference ID")
    channel_id: str = Field(..., description="YouTube Channel ID")
    message_id: Optional[str] = Field(default=None, description="Generated message draft ID")
    channel_type: str = Field(default="email", description="'email' or 'instagram_dm'")
    recipient_contact: str = Field(..., description="Email address or Instagram handle")
    is_simulation: bool = Field(default=True, description="True if simulated, False if live delivered")
    source_url: Optional[str] = Field(default=None, description="Profile source URL")


class OutreachLogResponse(OutreachLogCreate):
    id: str
    status: str = Field(
        default="simulated",
        description="'simulated', 'sent', 'failed', 'duplicate_prevented'"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    error_details: Optional[str] = None
    audit_metadata: Dict[str, Any] = Field(default_factory=dict)
