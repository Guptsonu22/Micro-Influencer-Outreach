"""Repository layer for Influencer/Creator persistence."""

import logging
from typing import Any, Dict, List, Optional
from backend.app.core.database import db_manager

logger = logging.getLogger("edxso.repository.creator")


class CreatorRepository:
    """Handles MongoDB and in-memory operations for influencer profiles."""

    async def upsert(self, creator_data: Dict[str, Any]) -> str:
        return await db_manager.upsert_creator(creator_data)

    async def bulk_upsert(self, creators: List[Dict[str, Any]]) -> int:
        return await db_manager.bulk_upsert_creators(creators)

    async def get_by_channel_id(self, channel_id: str) -> Optional[Dict[str, Any]]:
        return await db_manager.get_creator_by_channel_id(channel_id)

    async def list(
        self,
        is_synthetic: Optional[bool] = None,
        is_qualified: Optional[bool] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        return await db_manager.list_creators(
            is_synthetic=is_synthetic,
            is_qualified=is_qualified,
            search_query=search_query,
            skip=skip,
            limit=limit
        )

    async def count(
        self,
        is_synthetic: Optional[bool] = None,
        is_qualified: Optional[bool] = None
    ) -> int:
        return await db_manager.count_creators(
            is_synthetic=is_synthetic,
            is_qualified=is_qualified
        )


creator_repository = CreatorRepository()
