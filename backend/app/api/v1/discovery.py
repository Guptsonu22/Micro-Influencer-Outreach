"""Discovery execution and run management endpoints."""

import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Query, status
from backend.app.core.database import db_manager
from backend.app.core.exceptions import ResourceNotFoundError
from backend.app.schemas.discovery import DiscoveryRunCreate, DiscoveryRunResponse, DiscoverySummary
from backend.app.services.youtube_service import youtube_service

router = APIRouter(prefix="/discovery", tags=["Discovery Runs"])


@router.post("/runs", response_model=DiscoveryRunResponse, status_code=status.HTTP_201_CREATED)
async def create_and_execute_discovery_run(payload: DiscoveryRunCreate):
    """Executes a multi-query discovery run on YouTube and saves discovered profiles.

    - Supports quota budget limits and graceful pagination.
    - Transparently returns summary with qualifying vs rejected channels and reasons.
    - Does NOT fabricate data; distinguishes real API records from synthetic demo records.
    """
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()

    # Initial state
    run_record = {
        "id": run_id,
        "status": "running",
        "queries": payload.queries or ["AI tools tutorials"],
        "target_count": payload.target_count,
        "region_code": payload.region_code,
        "source_name": "Synthetic Demo Generator" if payload.use_demo_mode else "YouTube Data API v3",
        "is_demo_run": payload.use_demo_mode,
        "summary": DiscoverySummary().model_dump(),
        "error_message": None,
        "started_at": now,
        "completed_at": None,
    }
    await db_manager.save_discovery_run(run_record)

    try:
        creators, summary_dict = await youtube_service.execute_discovery_run(
            queries=payload.queries or ["AI tools tutorials"],
            target_count=payload.target_count,
            max_quota_budget=payload.max_quota_budget,
            min_subscribers=payload.min_subscribers,
            max_subscribers=payload.max_subscribers,
            region_code=payload.region_code,
            use_demo_mode=payload.use_demo_mode
        )

        # Bulk upsert discovered creators to database
        if creators:
            await db_manager.bulk_upsert_creators(creators)

        qualifying_count = summary_dict.get("qualifying_channels", 0)
        status_value = "completed" if qualifying_count >= payload.target_count else "partial"
        if any("quota" in str(err).lower() for err in summary_dict.get("api_errors", [])):
            status_value = "quota_exceeded"

        run_record["status"] = status_value
        run_record["summary"] = summary_dict
        run_record["completed_at"] = datetime.utcnow()

        await db_manager.save_discovery_run(run_record)
        return DiscoveryRunResponse(**run_record)

    except Exception as exc:
        run_record["status"] = "failed"
        run_record["error_message"] = str(exc)
        run_record["completed_at"] = datetime.utcnow()
        await db_manager.save_discovery_run(run_record)
        return DiscoveryRunResponse(**run_record)


@router.get("/runs/{run_id}", response_model=DiscoveryRunResponse)
async def get_discovery_run(run_id: str):
    """Retrieves status and summary details for a specific discovery execution."""
    run = None
    if not db_manager.use_in_memory and db_manager.db is not None:
        doc = await db_manager.db.discovery_runs.find_one({"id": run_id})
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        run = doc
    else:
        run = db_manager._in_memory_discovery_runs.get(run_id)

    if not run:
        raise ResourceNotFoundError(resource="DiscoveryRun", identifier=run_id)

    return DiscoveryRunResponse(**run)


@router.get("/runs", response_model=List[DiscoveryRunResponse])
async def list_discovery_runs(
    limit: int = Query(default=20, ge=1, le=100, description="Max runs to return")
):
    """Lists past discovery executions ordered by start time."""
    runs = await db_manager.list_discovery_runs(limit=limit)
    return [DiscoveryRunResponse(**run) for run in runs]
