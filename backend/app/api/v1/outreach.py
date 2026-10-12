"""Outreach logging and duplicate prevention endpoints."""

import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Query, status
from backend.app.core.config import settings
from backend.app.core.database import db_manager
from backend.app.core.exceptions import DuplicateResourceError
from backend.app.schemas.outreach import OutreachLogCreate, OutreachLogResponse

router = APIRouter(prefix="/outreach", tags=["Outreach & Delivery Tracking"])


@router.post("/logs", response_model=OutreachLogResponse, status_code=status.HTTP_201_CREATED)
async def record_outreach(payload: OutreachLogCreate):
    """Records an outreach attempt, enforcing strict duplicate communication prevention."""
    # Check if this channel has already received outreach
    has_contacted = await db_manager.has_existing_outreach(
        channel_id=payload.channel_id,
        channel_type=payload.channel_type
    )

    if has_contacted:
        raise DuplicateResourceError(
            resource=f"Outreach ({payload.channel_type})",
            identifier=payload.channel_id
        )

    log_id = f"out_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()
    status_value = "simulated" if payload.is_simulation else "sent"

    log_entry = {
        "id": log_id,
        "creator_id": payload.creator_id,
        "channel_id": payload.channel_id,
        "message_id": payload.message_id,
        "channel_type": payload.channel_type,
        "recipient_contact": payload.recipient_contact,
        "is_simulation": payload.is_simulation,
        "source_url": payload.source_url,
        "status": status_value,
        "timestamp": now,
        "error_details": None,
        "audit_metadata": {
            "simulation_mode": settings.SIMULATION_MODE,
            "ip_origin": "127.0.0.1",
        }
    }

    await db_manager.log_outreach(log_entry)
    return OutreachLogResponse(**log_entry)


@router.get("/logs", response_model=List[OutreachLogResponse])
async def list_outreach_logs(
    limit: int = Query(default=50, ge=1, le=100)
):
    """Retrieves immutable audit logs of all past outreach attempts."""
    logs = await db_manager.list_outreach_logs(limit=limit)
    return [OutreachLogResponse(**l) for l in logs]
