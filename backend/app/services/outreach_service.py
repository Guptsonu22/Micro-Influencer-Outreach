"""Outreach service with strict 7-stage verification gatekeeper, atomic duplicate lock, and safety guards."""

from datetime import datetime
import re
import uuid
from typing import Any, Dict, Optional
from backend.app.core.config import settings
from backend.app.core.database import db_manager
from backend.app.core.exceptions import (
    AppException,
    DuplicateResourceError,
    ResourceNotFoundError,
    ValidationError
)
from backend.app.core.logging import get_logger
from backend.app.schemas.outreach import (
    OutreachSendRequest,
    OutreachDispatchResponse,
    InstagramDMCopyResponse,
    OutreachChannelType
)
from backend.app.services.email.factory import get_email_provider
from backend.app.services.llm_service import personalization_service

logger = get_logger("outreach.service")

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class OutreachGatekeeperError(AppException):
    """Raised when an outreach candidate fails one of the 7 mandatory pre-send gates."""
    def __init__(self, gate_number: int, reason: str):
        super().__init__(
            status_code=400,
            message=f"Outreach Gate #{gate_number} Blocked: {reason}",
            error_code=f"GATE_{gate_number}_VIOLATION"
        )


class OutreachService:
    """Orchestrates safe, multi-gated email and Instagram DM outreach dispatches."""

    async def dispatch_outreach(self, request: OutreachSendRequest) -> OutreachDispatchResponse:
        """Executes the 7-stage verification gatekeeper and dispatches outreach."""
        logger.info(
            "Initiating outreach evaluation for Channel: %s | Type: %s | Campaign: %s | LiveRequested: %s",
            request.channel_id,
            request.channel_type.value,
            request.campaign_id,
            request.is_live_requested
        )

        # -------------------------------------------------------------
        # Instagram DM Special Path: Manual Copy Workflow Only
        # -------------------------------------------------------------
        if request.channel_type == OutreachChannelType.INSTAGRAM_DM:
            return await self._handle_instagram_dm_workflow(request)

        # -------------------------------------------------------------
        # Gate 1: Influencer Qualification or Explicit Override
        # -------------------------------------------------------------
        creator = await db_manager.get_creator_by_channel_id(request.channel_id)
        if not creator:
            raise ResourceNotFoundError(resource="Influencer", identifier=request.channel_id)

        is_qualified = (
            creator.get("classification", {}).get("is_qualified", False)
            or creator.get("classification", {}).get("decision") == "pass"
        )
        if not is_qualified and not request.allow_ineligible_override:
            decision = creator.get("classification", {}).get("decision", "unqualified")
            raise OutreachGatekeeperError(
                gate_number=1,
                reason=(
                    f"Creator '{creator.get('title')}' is classified as '{decision}'. "
                    f"Dispatches require a qualified creator or an explicit allow_ineligible_override=True."
                )
            )

        # -------------------------------------------------------------
        # Gate 2: Contact Email Presence and RFC Format Validity
        # -------------------------------------------------------------
        contact_email = creator.get("enrichment", {}).get("contact_email")
        if (
            not contact_email
            or str(contact_email).strip().lower() in ["", "not found", "none", "null", "unknown", "n/a"]
            or not EMAIL_REGEX.match(str(contact_email).strip())
        ):
            raise OutreachGatekeeperError(
                gate_number=2,
                reason=(
                    f"Creator '{creator.get('title')}' has no verified business email "
                    f"(found '{contact_email}'). Dispatches require a verified RFC-compliant email address."
                )
            )
        to_email = str(contact_email).strip()

        # -------------------------------------------------------------
        # Gate 3: Personalized Email Draft Existence
        # -------------------------------------------------------------
        message = None
        if request.message_id:
            message = await db_manager.get_generated_message(request.message_id)
        else:
            # Look up drafts generated for this channel
            existing_messages = await db_manager.list_generated_messages(channel_id=request.channel_id, limit=1)
            if existing_messages:
                message = existing_messages[0]

        if not message or not message.get("email_body"):
            # Check if creator has outreach copy embedded
            embedded_outreach = creator.get("outreach", {})
            if embedded_outreach and embedded_outreach.get("email_body"):
                message = embedded_outreach
            else:
                raise OutreachGatekeeperError(
                    gate_number=3,
                    reason=(
                        f"No personalized email draft exists for creator '{creator.get('title')}'. "
                        "Generate a personalized draft via AI Message Studio before dispatch."
                    )
                )

        subject = message.get("email_subject") or f"Collaboration with EDXSO x {creator.get('title')}"
        body_text = message.get("email_body", "")

        # -------------------------------------------------------------
        # Gate 4: Word Count & Content Quality Checks (60–90 words)
        # -------------------------------------------------------------
        word_count = personalization_service.count_words(body_text)
        if word_count < 60 or word_count > 90:
            raise OutreachGatekeeperError(
                gate_number=4,
                reason=(
                    f"Email body contains {word_count} words. Assignment guidelines strictly require "
                    "between 60 and 90 words. Please adjust the draft in AI Message Studio."
                )
            )

        # -------------------------------------------------------------
        # Gate 5: Explicit User Approval for Live Sending
        # -------------------------------------------------------------
        if request.is_live_requested:
            if not request.confirmed_live_approval:
                raise OutreachGatekeeperError(
                    gate_number=5,
                    reason=(
                        "Live email delivery requested without explicit confirmation. "
                        "The operator must explicitly check and confirm live approval."
                    )
                )
            if settings.SIMULATION_MODE or not settings.ALLOW_LIVE_EMAIL_SENDING:
                raise OutreachGatekeeperError(
                    gate_number=5,
                    reason=(
                        "Live email delivery is disabled in system safety settings "
                        "(SIMULATION_MODE=true or ALLOW_LIVE_EMAIL_SENDING=false). "
                        "Switch to simulation mode or configure approved server SMTP settings."
                    )
                )

        # -------------------------------------------------------------
        # Gate 6 & Gate 7: Duplicate Key Check & Atomic Reservation Lock
        # -------------------------------------------------------------
        has_prior_outreach = await db_manager.has_existing_outreach(
            channel_id=request.channel_id,
            channel_type=request.channel_type.value,
            campaign_id=request.campaign_id
        )
        if has_prior_outreach:
            raise DuplicateResourceError(
                resource=f"Outreach ({request.channel_type.value} for campaign {request.campaign_id})",
                identifier=request.channel_id
            )

        # Atomic reservation with status 'sending'
        log_id = f"out_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow()
        is_simulation = not request.is_live_requested or settings.SIMULATION_MODE

        initial_log = {
            "id": log_id,
            "creator_id": request.creator_id or creator.get("channel_id"),
            "channel_id": request.channel_id,
            "campaign_id": request.campaign_id,
            "message_id": request.message_id or message.get("id"),
            "channel_type": request.channel_type.value,
            "recipient_contact": to_email,
            "is_simulation": is_simulation,
            "source_url": creator.get("channel_url"),
            "status": "sending",
            "provider_name": "Pending",
            "provider_message_id": None,
            "timestamp": now,
            "completed_at": None,
            "error_details": None,
            "audit_metadata": {
                "word_count": word_count,
                "allow_ineligible_override": request.allow_ineligible_override,
                "is_live_requested": request.is_live_requested,
                "confirmed_live_approval": request.confirmed_live_approval,
                "simulation_mode": settings.SIMULATION_MODE,
            }
        }

        # Atomically reserve to prevent race conditions from concurrent requests
        await db_manager.reserve_outreach_attempt(
            campaign_id=request.campaign_id,
            channel_id=request.channel_id,
            channel_type=request.channel_type.value,
            initial_log=initial_log
        )

        # -------------------------------------------------------------
        # Execution Layer: Dispatch via Selected Provider
        # -------------------------------------------------------------
        provider = get_email_provider(is_live_requested=request.is_live_requested)
        delivery_result = await provider.send_email(
            to_email=to_email,
            subject=subject,
            body_text=body_text
        )

        # -------------------------------------------------------------
        # Post-Execution: Update Persistent Status & Timestamps
        # -------------------------------------------------------------
        completed_at = datetime.utcnow()
        final_status = delivery_result.status

        update_data = {
            "status": final_status,
            "provider_name": delivery_result.provider_name,
            "provider_message_id": delivery_result.provider_message_id,
            "completed_at": completed_at,
            "error_details": delivery_result.error,
            "audit_metadata": {
                **initial_log["audit_metadata"],
                "provider_response": delivery_result.provider_response,
                "is_ambiguous": delivery_result.is_ambiguous,
            }
        }

        await db_manager.update_outreach_status(log_id, update_data)

        # Sync back to creator record
        creator["outreach"] = {
            "email_subject": subject,
            "email_body": body_text,
            "instagram_dm": message.get("instagram_dm"),
            "status": final_status,
            "is_simulation": is_simulation,
            "delivery_timestamp": completed_at,
            "error_message": delivery_result.error
        }
        await db_manager.upsert_creator(creator)

        return OutreachDispatchResponse(
            id=log_id,
            channel_id=request.channel_id,
            creator_id=request.creator_id or creator.get("channel_id"),
            campaign_id=request.campaign_id,
            channel_type=request.channel_type.value,
            recipient_contact=to_email,
            status=final_status,
            is_simulation=is_simulation,
            provider_name=delivery_result.provider_name,
            provider_message_id=delivery_result.provider_message_id,
            dispatched_at=now,
            completed_at=completed_at,
            error_message=delivery_result.error,
            audit_trail={
                "word_count": word_count,
                "provider_response": delivery_result.provider_response,
                "is_ambiguous": delivery_result.is_ambiguous
            }
        )

    async def _handle_instagram_dm_workflow(
        self,
        request: OutreachSendRequest
    ) -> OutreachDispatchResponse:
        """Enforces Meta Terms of Service compliance: Instagram DMs are copy drafts only."""
        creator = await db_manager.get_creator_by_channel_id(request.channel_id)
        if not creator:
            raise ResourceNotFoundError(resource="Influencer", identifier=request.channel_id)

        # Check existing outreach
        has_contacted = await db_manager.has_existing_outreach(
            channel_id=request.channel_id,
            channel_type=request.channel_type.value,
            campaign_id=request.campaign_id
        )
        if has_contacted:
            raise DuplicateResourceError(
                resource=f"Outreach (Instagram DM for campaign {request.campaign_id})",
                identifier=request.channel_id
            )

        # Retrieve DM draft
        existing_messages = await db_manager.list_generated_messages(channel_id=request.channel_id, limit=1)
        dm_copy = ""
        if existing_messages and existing_messages[0].get("instagram_dm"):
            dm_copy = existing_messages[0]["instagram_dm"]
        elif creator.get("outreach", {}).get("instagram_dm"):
            dm_copy = creator["outreach"]["instagram_dm"]
        else:
            dm_copy = f"Hi {creator.get('title')}, love your tech tutorials! We'd love to sponsor a video with EDXSO. Let's collaborate!"

        log_id = f"out_ig_{uuid.uuid4().hex[:10]}"
        now = datetime.utcnow()

        log_entry = {
            "id": log_id,
            "creator_id": creator.get("channel_id"),
            "channel_id": request.channel_id,
            "campaign_id": request.campaign_id,
            "message_id": request.message_id,
            "channel_type": "instagram_dm",
            "recipient_contact": creator.get("custom_url") or creator.get("title"),
            "is_simulation": True,
            "source_url": creator.get("channel_url"),
            "status": "approved",
            "provider_name": "Manual Copy Workflow (Meta TOS Safe)",
            "provider_message_id": f"ig_manual_{uuid.uuid4().hex[:8]}",
            "timestamp": now,
            "completed_at": now,
            "error_details": None,
            "audit_metadata": {
                "compliance_rule": "Direct Message automation blocked per Instagram Platform Policy.",
                "dm_length": len(dm_copy)
            }
        }

        await db_manager.reserve_outreach_attempt(
            campaign_id=request.campaign_id,
            channel_id=request.channel_id,
            channel_type="instagram_dm",
            initial_log=log_entry
        )

        return OutreachDispatchResponse(
            id=log_id,
            channel_id=request.channel_id,
            creator_id=creator.get("channel_id"),
            campaign_id=request.campaign_id,
            channel_type="instagram_dm",
            recipient_contact=creator.get("custom_url") or creator.get("title"),
            status="approved",
            is_simulation=True,
            provider_name="Manual Copy Workflow",
            provider_message_id=log_entry["provider_message_id"],
            dispatched_at=now,
            completed_at=now,
            error_message=None,
            audit_trail=log_entry["audit_metadata"],
            instagram_dm_copy=dm_copy,
            policy_notice=(
                "Meta Policy Compliance: Automated DM dispatching is disabled to protect against "
                "platform account bans. Use the Manual Copy workflow to send directly from Instagram."
            )
        )

    async def get_instagram_dm_copy(self, channel_id: str) -> InstagramDMCopyResponse:
        """Retrieves verified Instagram DM draft copy for the manual clipboard workflow."""
        creator = await db_manager.get_creator_by_channel_id(channel_id)
        if not creator:
            raise ResourceNotFoundError(resource="Influencer", identifier=channel_id)

        messages = await db_manager.list_generated_messages(channel_id=channel_id, limit=1)
        dm_copy = ""
        if messages and messages[0].get("instagram_dm"):
            dm_copy = messages[0]["instagram_dm"]
        elif creator.get("outreach", {}).get("instagram_dm"):
            dm_copy = creator["outreach"]["instagram_dm"]
        else:
            dm_copy = f"Hi {creator.get('title')}, love your content! We'd love to partner with you on an EDXSO AI feature. Interested?"

        words = personalization_service.count_words(dm_copy)

        return InstagramDMCopyResponse(
            channel_id=channel_id,
            creator_name=creator.get("title"),
            instagram_dm=dm_copy,
            word_count=words,
            character_count=len(dm_copy)
        )


outreach_service = OutreachService()
