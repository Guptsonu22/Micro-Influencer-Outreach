"""Discovery Run tracking schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DiscoveryRunCreate(BaseModel):
    query: str = Field(..., description="Target search query (e.g. 'AI Python tutorials')")
    target_count: int = Field(default=50, ge=1, le=100)
    region_code: str = Field(default="US")
    use_demo_mode: bool = Field(default=False)


class DiscoveryRunResponse(BaseModel):
    id: str
    query: str
    target_count: int
    region_code: str
    status: str = Field(default="completed", description="'pending', 'running', 'completed', 'failed'")
    creators_found_count: int = 0
    qualified_count: int = 0
    quota_units_used: int = 0
    is_demo_run: bool = False
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
