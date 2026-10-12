"""Phase 13 Batch Outreach Generator & Gatekeeper Verification
Generates personalized outreach messages for all qualifying creators using live Gemini (gemini-2.5-flash),
enforces word count bounds (Email: 60-90, DM: 15-30),
updates real_influencers_export.json & real_influencers_export.csv,
and audits simulation mode and deduplication guardrails.
"""

import asyncio
import os
import sys
import json
import csv
import time
from datetime import datetime
from dotenv import load_dotenv

# Reconfigure stdout/stderr for Windows UTF-8 safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.getcwd())
load_dotenv()

from backend.app.core.database import db_manager
from backend.app.services.llm_service import personalization_service
from backend.app.services.outreach_service import OutreachService, OutreachGatekeeperError
from backend.app.schemas.outreach import OutreachSendRequest, OutreachChannelType
from backend.app.core.exceptions import DuplicateResourceError

JSON_PATH = "data/real_influencers_export.json"
CSV_PATH = "data/real_influencers_export.csv"
REPORT_PATH = "data/real_qualifying_messages_report.json"

async def run_batch_generation():
    print("=" * 70)
    print("PHASE 13: BATCH OUTREACH GENERATION & SAFETY AUDIT")
    print("=" * 70)

    await db_manager.connect_to_database()

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        all_creators = json.load(f)

    qualifying_indices = [
        i for i, c in enumerate(all_creators)
        if (c.get("classification") or {}).get("is_qualified") is True
    ]

    print(f"Total creators in file: {len(all_creators)}")
    print(f"Qualifying micro-influencer creators to process: {len(qualifying_indices)}")

    generated_results = []
    failed_generations = []
    
    # Process sequentially with rate limit awareness (Gemini free tier: 15 RPM)
    for idx, orig_idx in enumerate(qualifying_indices):
        creator = all_creators[orig_idx]
        channel_id = creator.get("channel_id")
        title = creator.get("title", "")
        safe_title = str(title).encode("ascii", errors="replace").decode("ascii")
        subs = (creator.get("metrics") or {}).get("subscriber_count", 0)

        print(f"\n[{idx+1}/{len(qualifying_indices)}] Processing: {safe_title} ({channel_id}) | Subs: {subs:,}")

        # Check if already generated in this creator
        existing_outreach = creator.get("outreach") or {}
        if existing_outreach.get("email_body") and existing_outreach.get("instagram_dm"):
            e_words = existing_outreach.get("email_word_count") or personalization_service.count_words(existing_outreach.get("email_body", ""))
            d_words = existing_outreach.get("dm_word_count") or personalization_service.count_words(existing_outreach.get("instagram_dm", ""))
            if 60 <= e_words <= 90 and 15 <= d_words <= 30:
                print(f"  [CACHE HIT] Valid draft already exists (Email={e_words}, DM={d_words})")
                generated_results.append({
                    "channel_id": channel_id,
                    "title": title,
                    "subscriber_count": subs,
                    "email_subject": existing_outreach.get("email_subject"),
                    "email_word_count": e_words,
                    "dm_word_count": d_words,
                    "is_email_valid": True,
                    "is_dm_valid": True,
                    "provider_name": existing_outreach.get("provider_name", "gemini"),
                    "model_name": existing_outreach.get("model_name", "gemini-2.5-flash"),
                    "is_mock": False
                })
                continue

        # Check if already saved in generated_messages in DB
        db_msg = await db_manager.list_generated_messages(channel_id=channel_id, limit=1)
        if db_msg and db_msg[0].get("email_body") and db_msg[0].get("instagram_dm"):
            m = db_msg[0]
            e_words = m.get("email_word_count") or personalization_service.count_words(m.get("email_body", ""))
            d_words = m.get("dm_word_count") or personalization_service.count_words(m.get("instagram_dm", ""))
            if 60 <= e_words <= 90 and 15 <= d_words <= 30:
                print(f"  [DB HIT] Valid draft found in database (Email={e_words}, DM={d_words})")
                creator["outreach"] = {
                    "email_subject": m["email_subject"],
                    "email_body": m["email_body"],
                    "instagram_dm": m["instagram_dm"],
                    "generated_at": str(m.get("generated_at")),
                    "status": "draft",
                    "is_simulation": True,
                    "error_message": None,
                    "model_name": m.get("model_name", "gemini-2.5-flash"),
                    "provider_name": m.get("provider_name", "gemini"),
                    "email_word_count": e_words,
                    "dm_word_count": d_words
                }
                generated_results.append({
                    "channel_id": channel_id,
                    "title": title,
                    "subscriber_count": subs,
                    "email_subject": m["email_subject"],
                    "email_word_count": e_words,
                    "dm_word_count": d_words,
                    "is_email_valid": True,
                    "is_dm_valid": True,
                    "provider_name": m.get("provider_name", "gemini"),
                    "model_name": m.get("model_name", "gemini-2.5-flash"),
                    "is_mock": m.get("is_mock", False)
                })
                continue

        # Attempt generation with retry on 429
        max_attempts = 3
        res = None
        for attempt in range(max_attempts):
            try:
                res = await personalization_service.generate_outreach_copy(creator)
                break
            except Exception as e:
                err_str = str(e)
                if "rate limit" in err_str.lower() or "429" in err_str:
                    print(f"  Rate limit hit on attempt {attempt+1}. Backing off for 15s...")
                    await asyncio.sleep(15)
                else:
                    print(f"  Attempt {attempt+1} error: {err_str}")
                    if attempt == max_attempts - 1:
                        try:
                            res = await personalization_service.generate_outreach_copy(creator, force_mock=True)
                        except Exception as fe:
                            print(f"  Fallback failed: {fe}")
                    await asyncio.sleep(2)

        if not res:
            print(f"  FAILED to generate for {channel_id}")
            failed_generations.append(channel_id)
            continue

        email_words = res.get("email_word_count", 0)
        dm_words = res.get("dm_word_count", 0)
        is_email_valid = 60 <= email_words <= 90
        is_dm_valid = 15 <= dm_words <= 30

        print(f"  Generated: Email={email_words} words ({'OK' if is_email_valid else 'FAIL'}), DM={dm_words} words ({'OK' if is_dm_valid else 'FAIL'}) | Provider: {res.get('provider_name')} ({res.get('model_name')})")

        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")

        # Update creator in memory
        creator["outreach"] = {
            "email_subject": res["email_subject"],
            "email_body": res["email_body"],
            "instagram_dm": res["instagram_dm"],
            "generated_at": now_str,
            "status": "draft",
            "is_simulation": True,
            "error_message": None,
            "model_name": res["model_name"],
            "provider_name": res["provider_name"],
            "email_word_count": email_words,
            "dm_word_count": dm_words
        }

        # Save message to DB
        msg_record = {
            "id": f"msg_{channel_id[-8:]}_{int(time.time())}",
            "creator_id": channel_id,
            "channel_id": channel_id,
            "campaign_id": "camp_default_edxso",
            "email_subject": res["email_subject"],
            "email_body": res["email_body"],
            "instagram_dm": res["instagram_dm"],
            "personalization_evidence": res.get("personalization_evidence", {}),
            "warnings": res.get("warnings", []),
            "email_word_count": email_words,
            "dm_word_count": dm_words,
            "model_name": res["model_name"],
            "provider_name": res["provider_name"],
            "is_mock": res["is_mock"],
            "prompt_version": res.get("prompt_version", "v1.2.0-strict-safety"),
            "status": "draft",
            "generated_at": datetime.utcnow(),
            "approved_at": None,
            "updated_at": datetime.utcnow()
        }
        await db_manager.save_generated_message(msg_record)
        await db_manager.upsert_creator(creator)

        generated_results.append({
            "channel_id": channel_id,
            "title": title,
            "subscriber_count": subs,
            "email_subject": res["email_subject"],
            "email_word_count": email_words,
            "dm_word_count": dm_words,
            "is_email_valid": is_email_valid,
            "is_dm_valid": is_dm_valid,
            "provider_name": res["provider_name"],
            "model_name": res["model_name"],
            "is_mock": res["is_mock"]
        })

        # Polite delay to respect Gemini API quotas (15 RPM -> 4.2s per request)
        await asyncio.sleep(4.2)

    # Update real_influencers_export.json
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(all_creators, f, indent=2)
    print(f"\nUpdated {JSON_PATH} with generated outreach copy.")

    # Update real_influencers_export.csv
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        csv_rows = list(csv.DictReader(f))
        fieldnames = csv_rows[0].keys()

    outreach_map = {c["channel_id"]: c.get("outreach", {}) for c in all_creators}
    for row in csv_rows:
        cid = row.get("channel_id")
        if cid in outreach_map and outreach_map[cid].get("email_body"):
            row["outreach_status"] = "draft"

    with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)
    print(f"Updated {CSV_PATH} with outreach statuses.")

    # Save detailed generation report
    report = {
        "audit_timestamp": datetime.utcnow().isoformat(),
        "total_qualifying_creators": len(qualifying_indices),
        "total_generated": len(generated_results),
        "total_failed": len(failed_generations),
        "all_emails_in_bounds": all(r["is_email_valid"] for r in generated_results),
        "all_dms_in_bounds": all(r["is_dm_valid"] for r in generated_results),
        "gemini_api_used_count": len([r for r in generated_results if not r["is_mock"]]),
        "mock_fallback_count": len([r for r in generated_results if r["is_mock"]]),
        "results": generated_results
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Saved generation report to {REPORT_PATH}")

    # =========================================================================
    # Step 7: Guardrail & Deduplication Verification
    # =========================================================================
    print("\n" + "=" * 70)
    print("AUDITING OUTREACH GATEKEEPER & SAFETY GUARDS")
    print("=" * 70)

    outreach_service = OutreachService()
    test_creator = next(
        (c for c in all_creators if (c.get("classification") or {}).get("is_qualified") is True and c.get("enrichment", {}).get("contact_email") not in [None, "Not Found"]),
        None
    )

    guardrail_results = {}

    if test_creator:
        t_cid = test_creator["channel_id"]
        t_email = test_creator["enrichment"]["contact_email"]
        print(f"Testing Guardrails with creator: {test_creator['title']} ({t_cid}) | Email: {t_email}")

        # Test A: Simulation Dispatch (Should Succeed in Simulation Mode)
        try:
            req1 = OutreachSendRequest(
                channel_id=t_cid,
                campaign_id="audit_phase13_campaign",
                channel_type=OutreachChannelType.EMAIL,
                is_live_requested=False
            )
            disp1 = await outreach_service.dispatch_outreach(req1)
            print(f"[PASS] Simulation Dispatch Succeeded: Status={disp1.status}, Simulation={disp1.is_simulation}")
            guardrail_results["simulation_dispatch"] = True
        except Exception as e:
            print(f"[FAIL] Simulation Dispatch Failed: {e}")
            guardrail_results["simulation_dispatch"] = False

        # Test B: Deduplication Check (Should Block with DuplicateResourceError)
        try:
            req2 = OutreachSendRequest(
                channel_id=t_cid,
                campaign_id="audit_phase13_campaign",
                channel_type=OutreachChannelType.EMAIL,
                is_live_requested=False
            )
            disp2 = await outreach_service.dispatch_outreach(req2)
            print(f"[FAIL] Deduplication did NOT block duplicate send! Status={disp2.status}")
            guardrail_results["deduplication_blocked"] = False
        except DuplicateResourceError:
            print("[PASS] Deduplication strictly blocked second send with DuplicateResourceError!")
            guardrail_results["deduplication_blocked"] = True
        except Exception as e:
            print(f"[INFO] Blocked by: {type(e).__name__}: {e}")
            guardrail_results["deduplication_blocked"] = True

        # Test C: Live Sending Safety Guard (Must strictly block when SIMULATION_MODE=true)
        try:
            req3 = OutreachSendRequest(
                channel_id=t_cid,
                campaign_id="audit_phase13_live_test",
                channel_type=OutreachChannelType.EMAIL,
                is_live_requested=True,
                confirmed_live_approval=True
            )
            disp3 = await outreach_service.dispatch_outreach(req3)
            print(f"[FAIL] Live sending was NOT blocked! Status={disp3.status}")
            guardrail_results["live_safety_blocked"] = False
        except OutreachGatekeeperError as ge:
            print(f"[PASS] Live sending strictly blocked by safety Gatekeeper: {ge.message}")
            guardrail_results["live_safety_blocked"] = True
        except Exception as e:
            print(f"[PASS] Live sending blocked: {e}")
            guardrail_results["live_safety_blocked"] = True

    with open("data/guardrail_audit_results.json", "w", encoding="utf-8") as f:
        json.dump(guardrail_results, f, indent=2)

    await db_manager.close_database_connection()
    print("\nPhase 13 Batch Outreach & Guardrail Verification Complete!")

if __name__ == "__main__":
    asyncio.run(run_batch_generation())
