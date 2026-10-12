"""Outreach execution, dispatch, audit log, and safety gate schemas."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OutreachStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SIMULATED = "simulated"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    DUPLICATE_SKIPPED = "duplicate_skipped"
    AMBIGUOUS = "ambiguous"


class OutreachChannelType(str, Enum):
    EMAIL = "email"
    INSTAGRAM_DM = "instagram_dm"


class OutreachSendRequest(BaseModel):
    """Payload to trigger an outreach delivery attempt through the 7-stage gatekeeper."""
    channel_id: str = Field(..., description="Target creator YouTube Channel ID")
    creator_id: Optional[str] = Field(default=None, description="Optional Creator database ID")
    campaign_id: str = Field(default="camp_default", description="Campaign identifier for duplicate tracking")
    message_id: Optional[str] = Field(default=None, description="ID of the personalized message draft")
    channel_type: OutreachChannelType = Field(default=OutreachChannelType.EMAIL, description="'email' or 'instagram_dm'")
    is_live_requested: bool = Field(default=False, description="Set True to request live email delivery instead of simulation")
    confirmed_live_approval: bool = Field(default=False, description="Explicit operator approval required for live dispatch")
    allow_ineligible_override: bool = Field(default=False, description="Explicit override to send to an ineligible creator")


class OutreachLogCreate(BaseModel):
    creator_id: str = Field(..., description="Creator reference ID")
    channel_id: str = Field(..., description="YouTube Channel ID")
    campaign_id: str = Field(default="camp_default", description="Campaign ID")
    message_id: Optional[str] = Field(default=None, description="Generated message draft ID")
    channel_type: str = Field(default="email", description="'email' or 'instagram_dm'")
    recipient_contact: str = Field(..., description="Email address or Instagram handle")
    is_simulation: bool = Field(default=True, description="True if simulated, False if live delivered")
    source_url: Optional[str] = Field(default=None, description="Profile source URL")


class OutreachLogResponse(BaseModel):
    id: str
    creator_id: str
    channel_id: str
    campaign_id: str = "camp_default"
    message_id: Optional[str] = None
    channel_type: str
    recipient_contact: str
    is_simulation: bool
    source_url: Optional[str] = None
    status: str = Field(
        default="simulated",
        description="'draft', 'approved', 'simulated', 'sending', 'sent', 'failed', 'duplicate_skipped', 'ambiguous'"
    )
    provider_name: Optional[str] = None
    provider_message_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    error_details: Optional[str] = None
    audit_metadata: Dict[str, Any] = Field(default_factory=dict)


class OutreachDispatchResponse(BaseModel):
    """Structured response for an outreach dispatch attempt with complete audit trail."""
    id: str
    channel_id: str
    creator_id: str
    campaign_id: str
    channel_type: str
    recipient_contact: str
    status: str
    is_simulation: bool
    provider_name: str
    provider_message_id: Optional[str] = None
    dispatched_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    audit_trail: Dict[str, Any] = Field(default_factory=dict)
    instagram_dm_copy: Optional[str] = None
    policy_notice: Optional[str] = None


class InstagramDMCopyResponse(BaseModel):
    """Safe manual-copy response for Instagram Direct Messages."""
    channel_id: str
    creator_name: str
    instagram_dm: str
    word_count: int
    character_count: int
    meta_policy_notice: str = (
        "Meta Platform Terms Notice: Direct messaging automation is prohibited. "
        "This copy must be manually reviewed and sent via the official Instagram app."
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
