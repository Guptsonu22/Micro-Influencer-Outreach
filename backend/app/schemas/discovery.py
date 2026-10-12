"""Discovery Run tracking schemas with provenance and quota logging."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DiscoveryRunCreate(BaseModel):
    query: str = Field(..., description="Target search query (e.g. 'AI Python tutorials')")
    target_count: int = Field(default=50, ge=1, le=100, description="Target creator discovery count")
    region_code: str = Field(default="US", description="Two-letter ISO country code")
    use_demo_mode: bool = Field(default=False, description="If True, loads segregated demo synthetic records")


class DiscoveryRunResponse(BaseModel):
    id: str
    query: str
    target_count: int
    region_code: str
    source_name: str = Field(default="YouTube Data API v3")
    status: str = Field(default="completed", description="'pending', 'running', 'completed', 'failed'")
    creators_found_count: int = 0
    qualified_count: int = 0
    quota_units_used: int = 0
    is_demo_run: bool = False
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
