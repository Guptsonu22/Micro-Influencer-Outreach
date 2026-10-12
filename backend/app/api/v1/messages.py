"""Message draft generation, review, editing, and approval endpoints."""

import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Body, Query, status
from backend.app.core.database import db_manager
from backend.app.core.exceptions import ResourceNotFoundError, AppException
from backend.app.schemas.campaign import CampaignProfile
from backend.app.schemas.message import (
    GenerateMessageRequest,
    EditMessageRequest,
    GeneratedMessageResponse
)
from backend.app.services.llm_service import personalization_service

router = APIRouter(prefix="/messages", tags=["Outreach Personalization & Review"])


@router.post("/generate", response_model=GeneratedMessageResponse, status_code=status.HTTP_201_CREATED)
async def generate_message_draft(payload: GenerateMessageRequest):
    """Generates personalized email and Instagram DM copy for an influencer.

    - Adheres strictly to word count bounds (Email: 60-90 words, DM: 15-30 words).
    - Gates ineligible creators unless allow_ineligible_override is True.
    - Treats scraped profile content as untrusted data.
    """
    creator = await db_manager.get_creator_by_channel_id(payload.channel_id)
    if not creator:
        raise ResourceNotFoundError(resource="Influencer", identifier=payload.channel_id)

    # Optional campaign lookup
    campaign_data = None
    if payload.campaign_id:
        campaign_data = await db_manager.get_campaign(payload.campaign_id)

    camp_profile = CampaignProfile(**campaign_data) if campaign_data else CampaignProfile()

    # Generate outreach copy
    result = await personalization_service.generate_outreach_copy(
        creator=creator,
        campaign=camp_profile,
        allow_ineligible_override=payload.allow_ineligible_override,
        force_mock=payload.force_mock
    )

    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()

    msg_record = {
        "id": msg_id,
        "creator_id": payload.creator_id or creator.get("channel_id"),
        "channel_id": payload.channel_id,
        "campaign_id": payload.campaign_id,
        "email_subject": result["email_subject"],
        "email_body": result["email_body"],
        "instagram_dm": result["instagram_dm"],
        "personalization_evidence": result["personalization_evidence"],
        "warnings": result["warnings"],
        "email_word_count": result["email_word_count"],
        "dm_word_count": result["dm_word_count"],
        "model_name": result["model_name"],
        "provider_name": result["provider_name"],
        "is_mock": result["is_mock"],
        "prompt_version": result["prompt_version"],
        "status": "draft",
        "generated_at": now,
        "approved_at": None,
        "updated_at": now
    }

    # Save to generated_messages collection
    await db_manager.save_generated_message(msg_record)

    # Update current creator record's outreach draft
    creator["outreach"] = {
        "email_subject": result["email_subject"],
        "email_body": result["email_body"],
        "instagram_dm": result["instagram_dm"],
        "generated_at": now,
        "status": "draft",
        "is_simulation": True,
        "error_message": None
    }
    await db_manager.upsert_creator(creator)

    return GeneratedMessageResponse(**msg_record)


@router.get("", response_model=List[GeneratedMessageResponse])
async def list_messages(
    channel_id: Optional[str] = Query(default=None, description="Filter by creator channel ID"),
    status: Optional[str] = Query(default=None, description="Filter by status: 'draft', 'approved', 'rejected'"),
    limit: int = Query(default=50, ge=1, le=100)
):
    """Lists saved message drafts."""
    messages = await db_manager.list_generated_messages(channel_id=channel_id, limit=limit)
    if status:
        messages = [m for m in messages if m.get("status") == status]
    return [GeneratedMessageResponse(**m) for m in messages]


@router.get("/{message_id}", response_model=GeneratedMessageResponse)
async def get_message(message_id: str):
    """Retrieves a single message draft by message ID."""
    msg = await db_manager.get_generated_message(message_id)
    if not msg:
        raise ResourceNotFoundError(resource="GeneratedMessage", identifier=message_id)
    return GeneratedMessageResponse(**msg)


@router.get("/channel/{channel_id}", response_model=List[GeneratedMessageResponse])
async def get_messages_for_channel(channel_id: str):
    """Retrieves all generated drafts for a specific creator channel."""
    messages = await db_manager.list_generated_messages(channel_id=channel_id, limit=20)
    return [GeneratedMessageResponse(**m) for m in messages]


@router.put("/{message_id}", response_model=GeneratedMessageResponse)
async def edit_message_draft(message_id: str, payload: EditMessageRequest):
    """Allows operators to manually edit email subject, body, or Instagram DM drafts before approval."""
    msg = await db_manager.get_generated_message(message_id)
    if not msg:
        raise ResourceNotFoundError(resource="GeneratedMessage", identifier=message_id)

    now = datetime.utcnow()
    if payload.email_subject is not None:
        msg["email_subject"] = payload.email_subject
    if payload.email_body is not None:
        msg["email_body"] = payload.email_body
        msg["email_word_count"] = personalization_service.count_words(payload.email_body)
    if payload.instagram_dm is not None:
        msg["instagram_dm"] = payload.instagram_dm
        msg["dm_word_count"] = personalization_service.count_words(payload.instagram_dm)
    if payload.status is not None:
        msg["status"] = payload.status
        if payload.status == "approved":
            msg["approved_at"] = now

    msg["updated_at"] = now
    await db_manager.save_generated_message(msg)

    # Sync back to creator record
    creator = await db_manager.get_creator_by_channel_id(msg["channel_id"])
    if creator:
        creator["outreach"] = {
            "email_subject": msg["email_subject"],
            "email_body": msg["email_body"],
            "instagram_dm": msg["instagram_dm"],
            "generated_at": msg["generated_at"],
            "approval_timestamp": msg["approved_at"],
            "status": msg["status"],
            "is_simulation": True,
            "error_message": None
        }
        await db_manager.upsert_creator(creator)

    return GeneratedMessageResponse(**msg)


@router.put("/{message_id}/status", response_model=GeneratedMessageResponse)
async def update_message_status(
    message_id: str,
    new_status: str = Query(..., description="'approved', 'rejected', or 'draft'")
):
    """Updates review approval status of a message draft."""
    return await edit_message_draft(message_id, EditMessageRequest(status=new_status))
