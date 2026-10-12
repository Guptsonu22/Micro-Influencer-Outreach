"""Outreach dispatch, simulation, gatekeeper enforcement, and CSV audit export endpoints."""

import io
from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, Query, Response, status
from backend.app.core.database import db_manager
from backend.app.schemas.outreach import (
    OutreachSendRequest,
    OutreachDispatchResponse,
    OutreachLogCreate,
    OutreachLogResponse,
    InstagramDMCopyResponse
)
from backend.app.services.outreach_service import outreach_service

router = APIRouter(prefix="/outreach", tags=["Outreach & Delivery Tracking"])


@router.post("/send", response_model=OutreachDispatchResponse, status_code=status.HTTP_200_OK)
async def send_outreach(payload: OutreachSendRequest):
    """Dispatches email or prepares manual Instagram DM copy through the 7-stage gatekeeper.

    Enforces:
    1. Influencer qualification or explicit override.
    2. Contact email presence and RFC validity.
    3. Personalized draft existence.
    4. Word-count (60–90 words) and safety checks.
    5. Explicit operator confirmation if live sending.
    6. Campaign + creator duplicate key check with atomic database lock.
    7. Outreach history check before delivery attempt.
    """
    return await outreach_service.dispatch_outreach(payload)


@router.get("/instagram-dm/{channel_id}", response_model=InstagramDMCopyResponse)
async def get_instagram_dm_copy(channel_id: str):
    """Retrieves verified Instagram DM copy for the operator manual clipboard workflow.

    Enforces Meta platform policy: no automated private messaging bots.
    """
    return await outreach_service.get_instagram_dm_copy(channel_id)


@router.post("/logs", response_model=OutreachLogResponse, status_code=status.HTTP_201_CREATED)
async def record_outreach(payload: OutreachLogCreate):
    """Records an outreach log directly (supporting simulation recorder)."""
    send_req = OutreachSendRequest(
        channel_id=payload.channel_id,
        creator_id=payload.creator_id,
        campaign_id=payload.campaign_id,
        message_id=payload.message_id,
        channel_type=payload.channel_type,  # type: ignore
        is_live_requested=not payload.is_simulation,
        confirmed_live_approval=not payload.is_simulation,
        allow_ineligible_override=True
    )
    res = await outreach_service.dispatch_outreach(send_req)
    return OutreachLogResponse(
        id=res.id,
        creator_id=res.creator_id,
        channel_id=res.channel_id,
        campaign_id=res.campaign_id,
        message_id=payload.message_id,
        channel_type=res.channel_type,
        recipient_contact=res.recipient_contact,
        is_simulation=res.is_simulation,
        source_url=payload.source_url,
        status=res.status,
        provider_name=res.provider_name,
        provider_message_id=res.provider_message_id,
        timestamp=res.dispatched_at,
        completed_at=res.completed_at,
        error_details=res.error_message,
        audit_metadata=res.audit_trail
    )


@router.get("/logs", response_model=List[OutreachLogResponse])
async def list_outreach_logs(
    limit: int = Query(default=50, ge=1, le=100),
    status: Optional[str] = Query(default=None, description="Filter by status: 'simulated', 'sent', 'failed', 'approved'"),
    channel_type: Optional[str] = Query(default=None, description="'email' or 'instagram_dm'")
):
    """Retrieves immutable audit logs of all past outreach attempts."""
    logs = await db_manager.list_outreach_logs(limit=limit)
    if status:
        logs = [l for l in logs if l.get("status") == status]
    if channel_type:
        logs = [l for l in logs if l.get("channel_type") == channel_type]
    return [OutreachLogResponse(**l) for l in logs]


@router.get("/export")
async def export_outreach_history(
    format: str = Query(default="csv", pattern="^(csv|json)$")
):
    """Streams complete historical audit log of outreach attempts as CSV or JSON."""
    logs = await db_manager.list_all_outreach_logs_for_export()

    flattened = []
    for l in logs:
        flattened.append({
            "Log ID": l.get("id"),
            "Channel ID": l.get("channel_id"),
            "Creator ID": l.get("creator_id"),
            "Campaign ID": l.get("campaign_id", "camp_default"),
            "Recipient Contact": l.get("recipient_contact"),
            "Channel Type": l.get("channel_type"),
            "Mode": "Simulated" if l.get("is_simulation", True) else "Live",
            "Status": l.get("status"),
            "Provider Name": l.get("provider_name", "N/A"),
            "Provider Message ID": l.get("provider_message_id", "N/A"),
            "Dispatched At": l.get("timestamp"),
            "Completed At": l.get("completed_at", "N/A"),
            "Error Details": l.get("error_details", "None"),
        })

    if format == "csv":
        df = pd.DataFrame(flattened)
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)
        return Response(
            content=buffer.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=outreach_audit_history.csv"}
        )
    else:
        return Response(
            content=pd.DataFrame(flattened).to_json(orient="records", indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=outreach_audit_history.json"}
        )
