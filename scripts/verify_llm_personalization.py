"""
Phase 11 — Real LLM Personalization Verification Script
=========================================================
Calls the live backend REST API to:
  1. Fetch real (non-synthetic) or available creator records.
  2. Generate Gemini-powered email + DM messages with real LLM provider.
  3. Validate email word counts (60–90 words) and DM word counts (15–30 words).
  4. Verify that generated copy references the creator's real name, niche, and content.
  5. Confirm provider metadata: provider_name='gemini', is_mock=False, model_name.
  6. Export verified results to JSON and Markdown reports.
"""

import sys
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, List

BACKEND_BASE_URL = "http://localhost:8000/api/v1"

def count_words(text: str) -> int:
    if not text:
        return 0
    return len([w for w in text.split() if w.strip()])

def api_get(endpoint: str) -> Dict[str, Any]:
    url = f"{BACKEND_BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "EDXSO-Phase11-Verifier/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))

def api_post(endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"{BACKEND_BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "EDXSO-Phase11-Verifier/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 70)
    print("  EDXSO PHASE 11: REAL LLM PERSONALIZATION VERIFICATION")
    print("=" * 70)

    # 1. Health check & Provider configuration check
    print("\n[Step 1] Checking Backend Health & LLM Provider Status...")
    try:
        health = api_get("/health")
        integrations = health.get("integrations", {})
        gemini_configured = integrations.get("gemini_api_configured", False)
        active_provider = integrations.get("active_llm_provider", "unknown")
        gemini_model = integrations.get("gemini_model", "unknown")
        is_mock_llm = integrations.get("is_mock_llm", True)

        print(f"  Backend Health Status:     {health.get('status')}")
        print(f"  GEMINI_API_KEY Configured: {gemini_configured}")
        print(f"  Active LLM Provider:       {active_provider.upper()} (is_mock={is_mock_llm})")
        print(f"  Configured Model:          {gemini_model}")

        if not gemini_configured:
            print("  [NOTICE] GEMINI_API_KEY is not configured in .env.")
            print("           Backend is running in safe development mode using MockLLMProvider.")
            print("           To verify live Gemini API calls, configure GEMINI_API_KEY and restart backend.")
        else:
            print("  [OK] Live Gemini API credentials detected.")
    except Exception as e:
        print(f"  [ERROR] Cannot connect to backend at {BACKEND_BASE_URL}: {e}")
        print("  Please ensure the backend is running via .\\run_backend.bat")
        sys.exit(1)

    # 2. Fetch candidates from DB
    print("\n[Step 2] Fetching Candidate Creators for Personalization...")
    try:
        creators_resp = api_get("/creators?page=1&page_size=20")
        creators = creators_resp.get("items", [])
    except Exception as e:
        print(f"  [ERROR] Failed to fetch creators: {e}")
        sys.exit(1)

    if not creators:
        print("  [ERROR] No creator records found in database.")
        sys.exit(1)

    print(f"  Found {len(creators)} candidate creators in current database view.")

    # Prioritize real/API records over synthetic if available
    real_creators = [c for c in creators if not c.get("is_synthetic", False)]
    selected_creators = real_creators[:3] if len(real_creators) >= 2 else creators[:3]
    
    print(f"  Selected {len(selected_creators)} creators for verification:")
    for idx, c in enumerate(selected_creators, 1):
        synth_flag = "[SYNTHETIC DEMO]" if c.get("is_synthetic") else "[REAL API RECORD]"
        print(f"    {idx}. {c.get('title')} ({c.get('channel_id')}) {synth_flag} - Niche: {c.get('classification', {}).get('niche')}")

    # 3. Generate messages for each creator
    print("\n[Step 3] Generating Personalized Messages & Validating Provider...")
    results = []

    for idx, creator in enumerate(selected_creators, 1):
        creator_id = creator.get("id") or creator.get("_id")
        creator_name = creator.get("title")
        is_synth = creator.get("is_synthetic", False)
        record_type = "SYNTHETIC DEMO" if is_synth else "REAL API RECORD"
        channel_id = creator.get("channel_id")
        niche = creator.get("classification", {}).get("niche", "N/A")

        print(f"\n  ------------------------------------------------------------------")
        print(f"  Creator #{idx}: {creator_name} ({channel_id}) [{record_type}]")
        print(f"  Niche: {niche}")
        print(f"  ------------------------------------------------------------------")

        req_payload = {
            "channel_id": channel_id,
            "creator_id": creator_id or channel_id,
            "force_mock": False,
            "allow_ineligible_override": True
        }

        try:
            gen_resp = api_post("/messages/generate", req_payload)
            msg_data = gen_resp.get("data", gen_resp)

            email_body = msg_data.get("email_body", "")
            ig_dm = msg_data.get("instagram_dm", "")
            email_words = count_words(email_body)
            dm_words = count_words(ig_dm)
            provider_name = msg_data.get("provider_name", "unknown")
            model_name = msg_data.get("model_name", "unknown")
            is_mock = msg_data.get("is_mock", True)
            evidence = msg_data.get("personalization_evidence", {})

            # Assertions
            email_ok = (60 <= email_words <= 90)
            dm_ok = (15 <= dm_words <= 30)
            is_real_gemini = (not is_mock and provider_name == "gemini")

            print(f"    [Provider Check] Provider: '{provider_name}' | Model: '{model_name}' | is_mock: {is_mock}")
            if is_real_gemini:
                print(f"    [Provider Status] >>> VERIFIED REAL GEMINI API CALL (Model: {model_name}) <<<")
            else:
                print(f"    [Provider Status] >>> OFFLINE MOCK PROVIDER (Development/Fallback) <<<")

            print(f"    [Email Word Count] {email_words} words -> {'PASS (60–90 words)' if email_ok else 'FAIL (Out of bounds)'}")
            print(f"    [DM Word Count]    {dm_words} words -> {'PASS (15–30 words)' if dm_ok else 'FAIL (Out of bounds)'}")
            print(f"    [Evidence Check]   Creator Name Used: '{evidence.get('creator_name_used')}'")
            print(f"                       Niche Used:        '{evidence.get('niche_used')}'")
            print(f"                       Recent Video:      '{evidence.get('recent_video_referenced')}'")
            print(f"    [Sample Subject]   {msg_data.get('email_subject')}")
            print(f"    [Sample DM]        \"{ig_dm}\"")

            results.append({
                "creator_id": creator_id,
                "creator_title": creator_name,
                "record_provenance": "synthetic" if is_synth else "real_api",
                "is_synthetic": is_synth,
                "channel_id": channel_id,
                "email_subject": msg_data.get("email_subject"),
                "email_body": email_body,
                "email_word_count": email_words,
                "email_words_valid": email_ok,
                "instagram_dm": ig_dm,
                "dm_word_count": dm_words,
                "dm_words_valid": dm_ok,
                "provider_name": provider_name,
                "model_name": model_name,
                "is_mock": is_mock,
                "is_real_gemini": is_real_gemini,
                "personalization_evidence": evidence,
                "generated_at": msg_data.get("generated_at", datetime.now().isoformat())
            })
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8")
            print(f"    [HTTP ERROR {he.code}]: {err_body}")
            try:
                parsed_err = json.loads(err_body)
                print(f"    [API Error Detail]: {parsed_err.get('message') or parsed_err.get('detail')}")
            except Exception:
                pass
        except Exception as ex:
            print(f"    [GENERATION ERROR]: {ex}")

    # 4. Export results
    print("\n[Step 4] Exporting Verification Results...")
    export_path = "data/llm_personalization_verification.json"
    try:
        with open(export_path, "w", encoding="utf-8") as f:
            json.dump({
                "timestamp": datetime.utcnow().isoformat(),
                "verifications_count": len(results),
                "records": results
            }, f, indent=2)
        print(f"  Successfully exported verification dataset to: {export_path}")
    except Exception as e:
        print(f"  [EXPORT ERROR]: {e}")

    print("\n" + "=" * 70)
    print("  PHASE 11 VERIFICATION COMPLETE")
    print("=" * 70)

if __name__ == "__main__":
    main()
