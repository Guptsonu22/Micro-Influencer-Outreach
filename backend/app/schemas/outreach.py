"""Outreach execution and audit log schemas."""

from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class OutreachLogCreate(BaseModel):
    creator_id: str
    channel_id: str
    message_id: Optional[str] = None
    channel_type: str = Field(default="email", description="'email' or 'instagram_dm'")
    recipient_contact: str = Field(..., description="Email address or Instagram handle")
    is_simulation: bool = True


class OutreachLogResponse(OutreachLogCreate):
    id: str
    status: str = Field(
        default="simulated",
        description="'simulated', 'sent', 'failed', 'duplicate_prevented'"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    error_details: Optional[str] = None
    audit_metadata: Dict[str, Any] = Field(default_factory=dict)
