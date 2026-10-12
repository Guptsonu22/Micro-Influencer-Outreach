"""Generated message drafts endpoints."""

import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Query, status
from backend.app.core.database import db_manager
from backend.app.core.exceptions import ResourceNotFoundError
from backend.app.schemas.message import GeneratedMessageCreate, GeneratedMessageResponse

router = APIRouter(prefix="/messages", tags=["Generated Messages"])


@router.post("", response_model=GeneratedMessageResponse, status_code=status.HTTP_201_CREATED)
async def save_generated_message(payload: GeneratedMessageCreate):
    """Saves a generated email and Instagram DM draft for review."""
    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    now = datetime.utcnow()
    msg_data = payload.model_dump()
    msg_data["id"] = msg_id
    msg_data["status"] = "draft"
    msg_data["generated_at"] = now
    msg_data["approved_at"] = None

    await db_manager.save_generated_message(msg_data)
    return GeneratedMessageResponse(**msg_data)


@router.get("", response_model=List[GeneratedMessageResponse])
async def list_messages(
    channel_id: Optional[str] = Query(default=None, description="Filter by creator channel ID"),
    limit: int = Query(default=50, ge=1, le=100)
):
    """Lists saved message drafts."""
    messages = await db_manager.list_generated_messages(channel_id=channel_id, limit=limit)
    return [GeneratedMessageResponse(**m) for m in messages]


@router.get("/{message_id}", response_model=GeneratedMessageResponse)
async def get_message(message_id: str):
    """Retrieves a single message draft."""
    msg = await db_manager.get_generated_message(message_id)
    if not msg:
        raise ResourceNotFoundError(resource="GeneratedMessage", identifier=message_id)
    return GeneratedMessageResponse(**msg)


@router.put("/{message_id}/status", response_model=GeneratedMessageResponse)
async def update_message_status(
    message_id: str,
    new_status: str = Query(..., description="'approved', 'rejected', 'draft'")
):
    """Updates the review approval status of a message draft."""
    msg = await db_manager.get_generated_message(message_id)
    if not msg:
        raise ResourceNotFoundError(resource="GeneratedMessage", identifier=message_id)

    msg["status"] = new_status
    if new_status == "approved":
        msg["approved_at"] = datetime.utcnow()

    await db_manager.save_generated_message(msg)
    return GeneratedMessageResponse(**msg)
