import asyncio
import logging
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import pymongo
from pymongo.errors import DuplicateKeyError
from backend.app.core.config import settings
from backend.app.core.exceptions import DuplicateResourceError

logger = logging.getLogger("edxso.database")


class DatabaseManager:
    """Manages MongoDB connection lifecycle, indexing, and collection operations."""

    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    # In-memory stores for offline testing and graceful database degradation
    _in_memory_creators: Dict[str, Dict[str, Any]] = {}
    _in_memory_discovery_runs: Dict[str, Dict[str, Any]] = {}
    _in_memory_campaigns: Dict[str, Dict[str, Any]] = {}
    _in_memory_messages: Dict[str, Dict[str, Any]] = {}
    _in_memory_outreach_logs: List[Dict[str, Any]] = []
    _outreach_lock: Optional[asyncio.Lock] = None

    use_in_memory: bool = False

    async def connect_to_database(self) -> bool:
        """Attempts to connect to MongoDB and build required indexes.

        Falls back gracefully to in-memory store if MongoDB is offline.
        """
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS
            )
            # Verify server connectivity
            await self.client.admin.command("ping")
            self.db = self.client[settings.MONGODB_DB_NAME]
            self.use_in_memory = False
            logger.info("Successfully connected to MongoDB database: %s", settings.MONGODB_DB_NAME)

            # Ensure indexes across collections
            await self._create_indexes()
            return True
        except Exception as exc:
            logger.warning(
                "MongoDB connection failed at %s (%s). Falling back gracefully to in-memory persistence adapter.",
                settings.MONGODB_URI,
                str(exc)
            )
            self.use_in_memory = True
            return False

    async def _create_indexes(self) -> None:
        """Creates unique and search indexes for influencer profiles and outreach guards."""
        if self.db is None:
            return

        try:
            # 1. Creators indexes
            await self.db.creators.create_index(
                [("channel_id", pymongo.ASCENDING)],
                unique=True,
                name="idx_creators_channel_id_unique"
            )
            await self.db.creators.create_index(
                [("is_synthetic", pymongo.ASCENDING)],
                name="idx_creators_is_synthetic"
            )
            await self.db.creators.create_index(
                [("classification.is_qualified", pymongo.ASCENDING)],
                name="idx_creators_is_qualified"
            )
            await self.db.creators.create_index(
                [("metrics.subscriber_count", pymongo.ASCENDING)],
                name="idx_creators_subscriber_count"
            )
            await self.db.creators.create_index(
                [("retrieved_at", pymongo.DESCENDING)],
                name="idx_creators_retrieved_at"
            )

            # 2. Outreach duplicate prevention unique compound index
            await self.db.outreach_logs.create_index(
                [
                    ("campaign_id", pymongo.ASCENDING),
                    ("channel_id", pymongo.ASCENDING),
                    ("channel_type", pymongo.ASCENDING)
                ],
                unique=True,
                name="idx_outreach_unique_campaign_channel_type"
            )
            await self.db.outreach_logs.create_index(
                [("channel_id", pymongo.ASCENDING), ("channel_type", pymongo.ASCENDING)],
                name="idx_outreach_channel_lookup"
            )
            await self.db.outreach_logs.create_index(
                [("timestamp", pymongo.DESCENDING)],
                name="idx_outreach_timestamp"
            )

            # 3. Discovery runs index
            await self.db.discovery_runs.create_index(
                [("started_at", pymongo.DESCENDING)],
                name="idx_discovery_started_at"
            )

            # 4. Campaigns index
            await self.db.campaigns.create_index(
                [("name", pymongo.ASCENDING)],
                name="idx_campaign_name"
            )

            # 5. Generated messages compound index
            await self.db.generated_messages.create_index(
                [("creator_id", pymongo.ASCENDING), ("channel_id", pymongo.ASCENDING)],
                name="idx_message_creator_channel"
            )

            logger.info("Successfully ensured all database indexes.")
        except Exception as exc:
            logger.warning("Error creating MongoDB indexes: %s", str(exc))

    async def close_database_connection(self) -> None:
        """Closes the MongoDB connection on shutdown."""
        if self.client:
            self.client.close()
            logger.info("MongoDB client connection closed.")

    async def is_healthy(self) -> bool:
        """Pings MongoDB to determine live connectivity."""
        if self.use_in_memory or not self.client:
            return False
        try:
            await self.client.admin.command("ping")
            return True
        except Exception:
            return False

    # -------------------------------------------------------------
    # Creators Operations
    # -------------------------------------------------------------

    async def upsert_creator(self, creator_data: Dict[str, Any]) -> str:
        channel_id = creator_data.get("channel_id")
        if not channel_id:
            raise ValueError("channel_id is required for upserting a creator.")

        if not self.use_in_memory and self.db is not None:
            update_data = {k: v for k, v in creator_data.items() if k != "_id"}
            await self.db.creators.update_one(
                {"channel_id": channel_id},
                {"$set": update_data},
                upsert=True
            )
            return channel_id
        else:
            self._in_memory_creators[channel_id] = creator_data
            return channel_id

    async def bulk_upsert_creators(self, creators: List[Dict[str, Any]]) -> int:
        count = 0
        for creator in creators:
            await self.upsert_creator(creator)
            count += 1
        return count

    async def get_creator_by_channel_id(self, channel_id: str) -> Optional[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            doc = await self.db.creators.find_one({"channel_id": channel_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc
        return self._in_memory_creators.get(channel_id)

    async def list_creators(
        self,
        is_synthetic: Optional[bool] = None,
        is_qualified: Optional[bool] = None,
        min_subscribers: Optional[int] = None,
        max_subscribers: Optional[int] = None,
        search_query: Optional[str] = None,
        niche: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            query: Dict[str, Any] = {}
            if is_synthetic is not None:
                query["is_synthetic"] = is_synthetic
            if is_qualified is not None:
                query["classification.is_qualified"] = is_qualified
            if min_subscribers is not None or max_subscribers is not None:
                query["metrics.subscriber_count"] = {}
                if min_subscribers is not None:
                    query["metrics.subscriber_count"]["$gte"] = min_subscribers
                if max_subscribers is not None:
                    query["metrics.subscriber_count"]["$lte"] = max_subscribers
            if niche:
                query["classification.niche"] = {"$regex": niche, "$options": "i"}
            if search_query:
                query["$or"] = [
                    {"title": {"$regex": search_query, "$options": "i"}},
                    {"custom_url": {"$regex": search_query, "$options": "i"}},
                    {"description": {"$regex": search_query, "$options": "i"}},
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
            items = list(self._in_memory_creators.values())
            if is_synthetic is not None:
                items = [c for c in items if c.get("is_synthetic") == is_synthetic]
            if is_qualified is not None:
                items = [
                    c for c in items
                    if c.get("classification", {}).get("is_qualified") == is_qualified
                ]
            if min_subscribers is not None:
                items = [
                    c for c in items
                    if (c.get("metrics", {}).get("subscriber_count") or 0) >= min_subscribers
                ]
            if max_subscribers is not None:
                items = [
                    c for c in items
                    if (c.get("metrics", {}).get("subscriber_count") or 0) <= max_subscribers
                ]
            if niche:
                items = [
                    c for c in items
                    if niche.lower() in c.get("classification", {}).get("niche", "").lower()
                ]
            if search_query:
                sq = search_query.lower()
                items = [
                    c for c in items
                    if sq in c.get("title", "").lower()
                    or sq in c.get("custom_url", "").lower()
                    or sq in c.get("description", "").lower()
                    or sq in c.get("classification", {}).get("niche", "").lower()
                ]
            return items[skip: skip + limit]

    async def count_creators(
        self,
        is_synthetic: Optional[bool] = None,
        is_qualified: Optional[bool] = None,
        min_subscribers: Optional[int] = None,
        max_subscribers: Optional[int] = None,
        search_query: Optional[str] = None,
        niche: Optional[str] = None
    ) -> int:
        if not self.use_in_memory and self.db is not None:
            query: Dict[str, Any] = {}
            if is_synthetic is not None:
                query["is_synthetic"] = is_synthetic
            if is_qualified is not None:
                query["classification.is_qualified"] = is_qualified
            if min_subscribers is not None or max_subscribers is not None:
                query["metrics.subscriber_count"] = {}
                if min_subscribers is not None:
                    query["metrics.subscriber_count"]["$gte"] = min_subscribers
                if max_subscribers is not None:
                    query["metrics.subscriber_count"]["$lte"] = max_subscribers
            if niche:
                query["classification.niche"] = {"$regex": niche, "$options": "i"}
            if search_query:
                query["$or"] = [
                    {"title": {"$regex": search_query, "$options": "i"}},
                    {"custom_url": {"$regex": search_query, "$options": "i"}},
                    {"description": {"$regex": search_query, "$options": "i"}},
                    {"classification.niche": {"$regex": search_query, "$options": "i"}},
                ]
            return await self.db.creators.count_documents(query)
        else:
            items = list(self._in_memory_creators.values())
            if is_synthetic is not None:
                items = [c for c in items if c.get("is_synthetic") == is_synthetic]
            if is_qualified is not None:
                items = [
                    c for c in items
                    if c.get("classification", {}).get("is_qualified") == is_qualified
                ]
            if min_subscribers is not None:
                items = [
                    c for c in items
                    if (c.get("metrics", {}).get("subscriber_count") or 0) >= min_subscribers
                ]
            if max_subscribers is not None:
                items = [
                    c for c in items
                    if (c.get("metrics", {}).get("subscriber_count") or 0) <= max_subscribers
                ]
            if niche:
                items = [
                    c for c in items
                    if niche.lower() in c.get("classification", {}).get("niche", "").lower()
                ]
            if search_query:
                sq = search_query.lower()
                items = [
                    c for c in items
                    if sq in c.get("title", "").lower()
                    or sq in c.get("custom_url", "").lower()
                    or sq in c.get("description", "").lower()
                    or sq in c.get("classification", {}).get("niche", "").lower()
                ]
            return len(items)

    # -------------------------------------------------------------
    # Discovery Runs Operations
    # -------------------------------------------------------------

    async def save_discovery_run(self, run_data: Dict[str, Any]) -> str:
        run_id = run_data.get("id")
        if not self.use_in_memory and self.db is not None:
            await self.db.discovery_runs.update_one(
                {"id": run_id},
                {"$set": run_data},
                upsert=True
            )
            return run_id
        else:
            self._in_memory_discovery_runs[run_id] = run_data
            return run_id

    async def list_discovery_runs(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            cursor = self.db.discovery_runs.find().sort("started_at", pymongo.DESCENDING).limit(limit)
            results = []
            async for doc in cursor:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        else:
            return sorted(
                list(self._in_memory_discovery_runs.values()),
                key=lambda x: str(x.get("started_at", "")),
                reverse=True
            )[:limit]

    # -------------------------------------------------------------
    # Campaigns Operations
    # -------------------------------------------------------------

    async def save_campaign(self, campaign_data: Dict[str, Any]) -> str:
        campaign_id = campaign_data.get("id")
        if not self.use_in_memory and self.db is not None:
            update_data = {k: v for k, v in campaign_data.items() if k != "_id"}
            await self.db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": update_data},
                upsert=True
            )
            return campaign_id
        else:
            self._in_memory_campaigns[campaign_id] = campaign_data
            return campaign_id

    async def get_campaign(self, campaign_id: str) -> Optional[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            doc = await self.db.campaigns.find_one({"id": campaign_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc
        return self._in_memory_campaigns.get(campaign_id)

    async def list_campaigns(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            cursor = self.db.campaigns.find().sort("created_at", pymongo.DESCENDING).limit(limit)
            results = []
            async for doc in cursor:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        else:
            return list(self._in_memory_campaigns.values())[:limit]

    # -------------------------------------------------------------
    # Generated Messages Operations
    # -------------------------------------------------------------

    async def save_generated_message(self, message_data: Dict[str, Any]) -> str:
        message_id = message_data.get("id")
        if not self.use_in_memory and self.db is not None:
            update_data = {k: v for k, v in message_data.items() if k != "_id"}
            await self.db.generated_messages.update_one(
                {"id": message_id},
                {"$set": update_data},
                upsert=True
            )
            return message_id
        else:
            self._in_memory_messages[message_id] = message_data
            return message_id

    async def get_generated_message(self, message_id: str) -> Optional[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            doc = await self.db.generated_messages.find_one({"id": message_id})
            if doc and "_id" in doc:
                doc["_id"] = str(doc["_id"])
            return doc
        return self._in_memory_messages.get(message_id)

    async def list_generated_messages(self, channel_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            query = {"channel_id": channel_id} if channel_id else {}
            cursor = self.db.generated_messages.find(query).limit(limit)
            results = []
            async for doc in cursor:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        else:
            items = list(self._in_memory_messages.values())
            if channel_id:
                items = [m for m in items if m.get("channel_id") == channel_id]
            return items[:limit]

    # -------------------------------------------------------------
    # Outreach Logs & Duplicate Prevention Operations
    # -------------------------------------------------------------

    async def log_outreach(self, log_entry: Dict[str, Any]) -> str:
        log_id = log_entry.get("id")
        if not self.use_in_memory and self.db is not None:
            await self.db.outreach_logs.insert_one(log_entry)
            return log_id
        else:
            self._in_memory_outreach_logs.append(log_entry)
            return log_id

    async def reserve_outreach_attempt(
        self,
        campaign_id: str,
        channel_id: str,
        channel_type: str,
        initial_log: Dict[str, Any]
    ) -> str:
        """Atomically reserves an outreach attempt with status 'sending' to lock out duplicate dispatches."""
        log_id = initial_log.get("id")

        if not self.use_in_memory and self.db is not None:
            try:
                await self.db.outreach_logs.insert_one(initial_log)
                return log_id
            except DuplicateKeyError:
                raise DuplicateResourceError(
                    resource=f"Outreach ({channel_type} for campaign {campaign_id})",
                    identifier=channel_id
                )
        else:
            if self._outreach_lock is None:
                self._outreach_lock = asyncio.Lock()

            async with self._outreach_lock:
                for log in self._in_memory_outreach_logs:
                    if (
                        log.get("channel_id") == channel_id
                        and log.get("channel_type") == channel_type
                        and log.get("campaign_id", "camp_default") == campaign_id
                        and log.get("status") in ["sent", "simulated", "sending"]
                    ):
                        raise DuplicateResourceError(
                            resource=f"Outreach ({channel_type} for campaign {campaign_id})",
                            identifier=channel_id
                        )

                self._in_memory_outreach_logs.append(initial_log)
                return log_id

    async def update_outreach_status(self, log_id: str, update_fields: Dict[str, Any]) -> bool:
        """Updates the status and provider metadata of a reserved outreach attempt."""
        if not self.use_in_memory and self.db is not None:
            result = await self.db.outreach_logs.update_one(
                {"id": log_id},
                {"$set": update_fields}
            )
            return result.modified_count > 0
        else:
            for log in self._in_memory_outreach_logs:
                if log.get("id") == log_id:
                    log.update(update_fields)
                    return True
            return False

    async def has_existing_outreach(
        self,
        channel_id: str,
        channel_type: str = "email",
        campaign_id: Optional[str] = None
    ) -> bool:
        """Checks if a creator has already received or simulated outreach to prevent duplicates."""
        query_filter: Dict[str, Any] = {
            "channel_id": channel_id,
            "channel_type": channel_type,
            "status": {"$in": ["sent", "simulated", "sending"]}
        }
        if campaign_id:
            query_filter["campaign_id"] = campaign_id

        if not self.use_in_memory and self.db is not None:
            count = await self.db.outreach_logs.count_documents(query_filter)
            return count > 0
        else:
            return any(
                log.get("channel_id") == channel_id
                and log.get("channel_type") == channel_type
                and (not campaign_id or log.get("campaign_id") == campaign_id)
                and log.get("status") in ["sent", "simulated", "sending"]
                for log in self._in_memory_outreach_logs
            )

    async def list_outreach_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.use_in_memory and self.db is not None:
            cursor = self.db.outreach_logs.find().sort("timestamp", pymongo.DESCENDING).limit(limit)
            results = []
            async for doc in cursor:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        else:
            return sorted(
                self._in_memory_outreach_logs,
                key=lambda x: str(x.get("timestamp", "")),
                reverse=True
            )[:limit]

    async def list_all_outreach_logs_for_export(self) -> List[Dict[str, Any]]:
        """Retrieves all outreach logs for complete CSV export."""
        if not self.use_in_memory and self.db is not None:
            cursor = self.db.outreach_logs.find().sort("timestamp", pymongo.DESCENDING)
            results = []
            async for doc in cursor:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        else:
            return sorted(
                self._in_memory_outreach_logs,
                key=lambda x: str(x.get("timestamp", "")),
                reverse=True
            )


db_manager = DatabaseManager()
