"""Discovery run tracking endpoints."""

import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Query, status
from backend.app.core.database import db_manager
from backend.app.schemas.discovery import DiscoveryRunCreate, DiscoveryRunResponse

router = APIRouter(prefix="/discovery", tags=["Discovery Runs"])


@router.post("/runs", response_model=DiscoveryRunResponse, status_code=status.HTTP_201_CREATED)
async def create_discovery_run(payload: DiscoveryRunCreate):
    """Initializes and records a new discovery run."""
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    run_data = {
        "id": run_id,
        "query": payload.query,
        "target_count": payload.target_count,
        "region_code": payload.region_code,
        "source_name": "YouTube Data API v3",
        "status": "pending",
        "creators_found_count": 0,
        "qualified_count": 0,
        "quota_units_used": 0,
        "is_demo_run": payload.use_demo_mode,
        "error_message": None,
        "started_at": datetime.utcnow(),
        "completed_at": None,
    }
    await db_manager.save_discovery_run(run_data)
    return DiscoveryRunResponse(**run_data)


@router.get("/runs", response_model=List[DiscoveryRunResponse])
async def list_discovery_runs(
    limit: int = Query(default=20, ge=1, le=100, description="Max runs to return")
):
    """Lists past discovery executions."""
    runs = await db_manager.list_discovery_runs(limit=limit)
    return [DiscoveryRunResponse(**run) for run in runs]
