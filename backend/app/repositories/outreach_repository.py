"""Repository layer for Outreach logs and duplicate message prevention."""

import logging
from typing import Any, Dict, List, Optional
from backend.app.core.database import db_manager

logger = logging.getLogger("edxso.repository.outreach")


class OutreachRepository:
    """Stores outreach logs and enforces duplicate communication guards."""

    _in_memory_logs: List[Dict[str, Any]] = []

    async def log_outreach(self, log_entry: Dict[str, Any]) -> str:
        """Records an outreach log entry."""
        if not db_manager.use_in_memory and db_manager.db is not None:
            res = await db_manager.db.outreach_logs.insert_one(log_entry)
            return str(res.inserted_id)
        else:
            self._in_memory_logs.append(log_entry)
            return str(len(self._in_memory_logs))

    async def has_existing_outreach(self, channel_id: str, channel_type: str = "email") -> bool:
        """Checks if a creator has already been contacted via the given channel."""
        if not db_manager.use_in_memory and db_manager.db is not None:
            count = await db_manager.db.outreach_logs.count_documents({
                "channel_id": channel_id,
                "channel_type": channel_type,
                "status": {"$in": ["sent", "simulated"]}
            })
            return count > 0
        else:
            return any(
                log.get("channel_id") == channel_id
                and log.get("channel_type") == channel_type
                and log.get("status") in ["sent", "simulated"]
                for log in self._in_memory_logs
            )

    async def list_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent outreach activity logs."""
        if not db_manager.use_in_memory and db_manager.db is not None:
            cursor = db_manager.db.outreach_logs.find().sort("timestamp", -1).limit(limit)
            results = []
            async for doc in cursor:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
                results.append(doc)
            return results
        else:
            return sorted(
                self._in_memory_logs,
                key=lambda x: x.get("timestamp", ""),
                reverse=True
            )[:limit]


outreach_repository = OutreachRepository()
