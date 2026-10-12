"""Common pagination, filtering, and API wrapper primitives."""

import math
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for pagination."""
    page: int = Field(default=1, ge=1, description="Page number starting at 1")
    page_size: int = Field(default=20, ge=1, le=100, description="Items per page")

    @property
    def skip(self) -> int:
        return (self.page - 1) * self.page_size


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard generic wrapper for paginated lists."""
    items: List[T]
    total: int = Field(..., ge=0, description="Total matching records count")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, description="Items per page")
    total_pages: int = Field(..., ge=0, description="Calculated total pages")
    has_next: bool
    has_prev: bool

    @classmethod
    def create(cls, items: List[T], total: int, page: int, page_size: int) -> "PaginatedResponse[T]":
        total_pages = math.ceil(total / page_size) if page_size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1
        )


class InfluencerFilterParams(BaseModel):
    """Query parameters for filtering influencer records."""
    is_qualified: Optional[bool] = Field(default=None, description="Filter by qualification status")
    is_synthetic: Optional[bool] = Field(default=None, description="Filter by demo/synthetic flag")
    min_subscribers: Optional[int] = Field(default=None, ge=0, description="Minimum subscriber count")
    max_subscribers: Optional[int] = Field(default=None, ge=0, description="Maximum subscriber count")
    search_query: Optional[str] = Field(default=None, description="Search term across name, bio, or handle")
    niche: Optional[str] = Field(default=None, description="Filter by content vertical")
