"""Database connection and repository layer for MongoDB."""

import logging
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.app.core.config import settings

logger = logging.getLogger("edxso.database")


class DatabaseManager:
    """Manages MongoDB connection lifecycle and collection access."""

    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    _in_memory_fallback: Dict[str, Dict[str, Any]] = {}
    use_in_memory: bool = False

    async def connect_to_database(self) -> bool:
        """Attempts to connect to MongoDB. Falls back to in-memory store if unreachable in dev mode."""
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2000
            )
            # Verify server connectivity
            await self.client.admin.command("ping")
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.use_in_memory = False
            logger.info("Successfully connected to MongoDB database: %s", settings.MONGODB_DB_NAME)

            # Ensure indexes for uniqueness and search performance
            await self.db.creators.create_index("channel_id", unique=True)
            await self.db.creators.create_index("is_synthetic")
            await self.db.creators.create_index("classification.is_qualified")
            return True
        except Exception as exc:
            logger.warning(
                "Could not connect to MongoDB at %s (%s). Using in-memory repository for local runtime.",
                settings.MONGODB_URI,
                str(exc)
            )
            self.use_in_memory = True
            return False

    async def close_database_connection(self) -> None:
        """Closes the MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    async def is_healthy(self) -> bool:
        """Verifies if MongoDB is reachable."""
        if self.use_in_memory or not self.client:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False

    # Data Access Layer Methods

    async def upsert_creator(self, creator_data: Dict[str, Any]) -> str:
        """Inserts or updates a creator document based on channel_id to prevent duplicates."""
        channel_id = creator_data.get("channel_id")
        if not channel_id:
            raise ValueError("channel_id is required for upserting a creator.")

        if not self.use_in_memory and self.db is not None:
            await self.db.creators.update_one(
                {"channel_id": channel_id},
                {"$set": creator_data},
                upsert=True
            )
            return channel_id
        else:
            self._in_memory_fallback[channel_id] = creator_data
            return channel_id

    async def bulk_upsert_creators(self, creators: List[Dict[str, Any]]) -> int:
        """Bulk upserts multiple creator records."""
        count = 0
        for creator in creators:
            await self.upsert_creator(creator)
            count += 1
        return count

    async def get_creator_by_channel_id(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single creator by YouTube channel ID."""
        if not self.use_in_memory and self.db is not None:
            doc = await self.db.creators.find_one({"channel_id": channel_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc
        return self._in_memory_fallback.get(channel_id)

    async def list_creators(
        self,
        is_synthetic: Optional[bool] = None,
        is_qualified: Optional[bool] = None,
        search_query: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Lists creators with optional filters."""
        if not self.use_in_memory and self.db is not None:
            query: Dict[str, Any] = {}
            if is_synthetic is not None:
                query["is_synthetic"] = is_synthetic
            if is_qualified is not None:
                query["classification.is_qualified"] = is_qualified
            if search_query:
                query["$or"] = [
                    {"title": {"$regex": search_query, "$options": "i"}},
                    {"custom_url": {"$regex": search_query, "$options": "i"}},
                    {"classification.niche": {"$regex": search_query, "$options": "i"}},
                ]

            cursor = self.db.creators.find(query).skip(skip).limit(limit)
            results = []
            async for doc in cursor:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        else:
            filtered = list(self._in_memory_fallback.values())
            if is_synthetic is not None:
                filtered = [c for c in filtered if c.get("is_synthetic") == is_synthetic]
            if is_qualified is not None:
                filtered = [
                    c for c in filtered
                    if c.get("classification", {}).get("is_qualified") == is_qualified
                ]
            if search_query:
                sq = search_query.lower()
                filtered = [
                    c for c in filtered
                    if sq in c.get("title", "").lower()
                    or sq in c.get("custom_url", "").lower()
                    or sq in c.get("classification", {}).get("niche", "").lower()
                ]
            return filtered[skip: skip + limit]

    async def count_creators(
        self,
        is_synthetic: Optional[bool] = None,
        is_qualified: Optional[bool] = None
    ) -> int:
        """Counts creators matching the filter criteria."""
        if not self.use_in_memory and self.db is not None:
            query: Dict[str, Any] = {}
            if is_synthetic is not None:
                query["is_synthetic"] = is_synthetic
            if is_qualified is not None:
                query["classification.is_qualified"] = is_qualified
            return await self.db.creators.count_documents(query)
        else:
            items = list(self._in_memory_fallback.values())
            if is_synthetic is not None:
                items = [c for c in items if c.get("is_synthetic") == is_synthetic]
            if is_qualified is not None:
                items = [
                    c for c in items
                    if c.get("classification", {}).get("is_qualified") == is_qualified
                ]
            return len(items)

    async def clear_all_creators(self, only_synthetic: bool = True) -> int:
        """Clears creators. Defaults to only clearing synthetic records to protect real data."""
        if not self.use_in_memory and self.db is not None:
            query = {"is_synthetic": True} if only_survival_guard(only_synthetic) else {}
            res = await self.db.creators.delete_many(query)
            return res.deleted_count
        else:
            initial = len(self._in_memory_fallback)
            if only_synthetic:
                self._in_memory_fallback = {
                    k: v for k, v in self._in_memory_fallback.items()
                    if not v.get("is_synthetic", False)
                }
            else:
                self._in_memory_fallback.clear()
            return initial - len(self._in_memory_fallback)


def only_survival_guard(only_synthetic: bool) -> bool:
    return only_synthetic


db_manager = DatabaseManager()
