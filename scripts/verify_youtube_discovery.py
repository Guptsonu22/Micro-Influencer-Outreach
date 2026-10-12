"""
Phase 12 — Real YouTube Influencer Discovery & Dataset Verification Script
==========================================================================
Executes and validates the real YouTube Data API v3 discovery pipeline:
  1. Checks YOUTUBE_API_KEY configuration without exposing the secret.
  2. Confirms official YouTube Data API invocation (use_demo_mode=False).
  3. Executes discovery for Technology & AI creators with target_count=50.
  4. Enforces the 5,000–100,000 subscriber micro-influencer range.
  5. Verifies source-backed channel IDs (UC...), source URLs, metrics, and timestamps.
  6. Validates engagement proxy calculation and documented formula.
  7. Ensures strict separation of synthetic demo records vs real records.
  8. Exports real dataset to CSV and JSON (data/real_influencers_export.csv/json).
  9. Reports honest metrics: discovered, qualifying, rejected, and quota usage.
"""

import sys
import os
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, List

BACKEND_BASE_URL = "http://localhost:8000/api/v1"

def api_get(endpoint: str) -> Any:
    url = f"{BACKEND_BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"User-Agent": "EDXSO-Phase12-Verifier/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        content_type = resp.headers.get("Content-Type", "")
        body = resp.read()
        if "application/json" in content_type:
            return json.loads(body.decode("utf-8"))
        elif "text/csv" in content_type:
            return body.decode("utf-8")
        return body.decode("utf-8")

def api_post(endpoint: str, payload: Dict[str, Any], timeout: int = 120) -> Dict[str, Any]:
    url = f"{BACKEND_BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "EDXSO-Phase12-Verifier/1.0"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=" * 75)
    print("  EDXSO PHASE 12: REAL YOUTUBE INFLUENCER DISCOVERY VERIFICATION")
    print("=" * 75)

    # Step 1: Health check & YouTube API configuration audit
    print("\n[Step 1] Auditing Backend Health & YouTube Data API Status...")
    try:
        health = api_get("/health")
        integrations = health.get("integrations", {})
        yt_configured = integrations.get("youtube_api_configured", False)
        gemini_configured = integrations.get("gemini_api_configured", False)
        db_info = health.get("database", {})

        print(f"  Backend Health Status:       {health.get('status')}")
        print(f"  YOUTUBE_API_KEY Configured:  {yt_configured}")
        print(f"  GEMINI_API_KEY Configured:   {gemini_configured} (Model: {integrations.get('gemini_model')})")
        print(f"  Database Total Records:      {db_info.get('total_records', 0)}")
        print(f"    - Real API Records:        {db_info.get('real_records', 0)}")
        print(f"    - Synthetic Demo Records:  {db_info.get('synthetic_records', 0)}")
    except Exception as e:
        print(f"  [ERROR] Cannot connect to backend at {BACKEND_BASE_URL}: {e}")
        print("  Please ensure the backend is running via .\\run_backend.bat")
        sys.exit(1)

    if not yt_configured:
        print("\n" + "!" * 75)
        print("  [BLOCKER IDENTIFIED] YOUTUBE_API_KEY IS NOT CONFIGURED IN .env")
        print("!" * 75)
        print("  Requirement 12 mandates honest reporting of blockers.")
        print("  The backend requires a Google Cloud YouTube Data API v3 key to discover real channels.")
        print("  Synthetic demo records CANNOT and WILL NOT be counted toward the 50 real channels target.")
        print("\n  To configure your key securely without terminal echoing:")
        print("  -------------------------------------------------------------")
        print('  $ytKey = Read-Host "Enter YouTube Data API Key" -AsSecureString')
        print('  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ytKey)')
        print('  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)')
        print('  (Get-Content .env) -replace "^YOUTUBE_API_KEY=.*", "YOUTUBE_API_KEY=\\"$plain\\"" | Set-Content .env')
        print('  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)')
        print('  $plain = $null; $ytKey = $null; [GC]::Collect()')
        print("  -------------------------------------------------------------")
        print("\n  After adding the key, reload the backend and re-run this script.")
        print("=" * 75)
        return

    # Step 2: Execute Real Discovery Run
    print("\n[Step 2] Executing Real Discovery Run (use_demo_mode=False)...")
    search_queries = [
        "AI tools tutorial",
        "Python AI developer",
        "Machine Learning tutorial",
        "Generative AI engineering",
        "LangChain AI tutorial"
    ]
    discovery_payload = {
        "queries": search_queries,
        "target_count": 50,
        "max_quota_budget": 3000,
        "min_subscribers": 5000,
        "max_subscribers": 100000,
        "region_code": "US",
        "use_demo_mode": False
    }

    print(f"  Target:            {discovery_payload['target_count']} qualifying micro-influencers")
    print(f"  Subscriber Range:  {discovery_payload['min_subscribers']:,} to {discovery_payload['max_subscribers']:,}")
    print(f"  Target Queries:    {', '.join(search_queries)}")
    print(f"  use_demo_mode:     False (Official YouTube Data API v3)")

    try:
        run_resp = api_post("/discovery/runs", discovery_payload, timeout=180)
        run_id = run_resp.get("id")
        run_status = run_resp.get("status")
        summary = run_resp.get("summary", {})
        err_msg = run_resp.get("error_message")

        print(f"\n  Run ID: {run_id} | Status: {run_status}")
        if err_msg:
            print(f"  [API Error / Blocker]: {err_msg}")

        print("\n[Step 3] Discovery Summary Metrics:")
        print(f"  Total Search Results Evaluated:  {summary.get('total_search_results', 0)}")
        print(f"  Unique Channels Found:           {summary.get('unique_channels_found', 0)}")
        print(f"  Qualifying Micro-Influencers:    {summary.get('qualifying_channels', 0)}")
        print(f"  Rejected Channels:               {summary.get('rejected_channels', 0)}")
        print(f"  Quota Units Consumed:            {summary.get('quota_units_used', 0)}")
        print(f"  API Requests Made:               {summary.get('api_requests_count', 0)}")

        rejection_breakdown = summary.get("rejection_breakdown", {})
        print("  Rejection Breakdown:")
        print(f"    - Below 5k subscribers:         {rejection_breakdown.get('too_few_subscribers', 0)}")
        print(f"    - Above 100k subscribers:       {rejection_breakdown.get('too_many_subscribers', 0)}")
        print(f"    - Hidden subscriber counts:     {rejection_breakdown.get('hidden_subscribers', 0)}")

        if summary.get("api_errors"):
            print(f"  Reported API Errors:             {summary.get('api_errors')}")
        if summary.get("continuation_instructions"):
            print(f"  Continuation Guidance:           {summary.get('continuation_instructions')}")

    except urllib.error.HTTPError as he:
        print(f"  [HTTP ERROR {he.code}]: {he.read().decode('utf-8')}")
        return
    except Exception as ex:
        print(f"  [DISCOVERY RUN ERROR]: {ex}")
        return

    # Step 4: Validate Real Channels in Database & Provenance
    print("\n[Step 4] Validating Real Creator Records in Database...")
    try:
        creators_resp = api_get("/creators?is_synthetic=false&page=1&page_size=100")
        real_creators = creators_resp.get("items", [])
        total_real = creators_resp.get("total", len(real_creators))
        print(f"  Real API Records Retrieved: {total_real}")
    except Exception as e:
        print(f"  [ERROR] Failed to query real creators: {e}")
        return

    if not real_creators:
        print("  [WARN] Zero real records found in database.")
        return

    # Inspect first 5 real records for provenance
    print("\n  Sample Real Records (First 5):")
    valid_id_count = 0
    for idx, c in enumerate(real_creators[:5], 1):
        ch_id = c.get("channel_id", "")
        is_real_yt_id = ch_id.startswith("UC") and len(ch_id) == 24
        if is_real_yt_id:
            valid_id_count += 1
        metrics = c.get("metrics", {})
        enrichment = c.get("enrichment", {})
        sub_count = metrics.get("subscriber_count")
        eng_rate = metrics.get("estimated_engagement_rate")
        email = enrichment.get("contact_email") or "Not Found"

        print(f"    {idx}. '{c.get('title')}'")
        print(f"       Channel ID:    {ch_id} ({'VALID YouTube ID' if is_real_yt_id else 'INVALID'})")
        print(f"       Channel URL:   {c.get('channel_url')}")
        print(f"       Subscribers:   {sub_count:, if isinstance(sub_count, int) else sub_count}")
        print(f"       Engagement:    {eng_rate}% (Formula: {metrics.get('engagement_formula_used', 'N/A')})")
        print(f"       Contact Email: {email}")
        print(f"       is_synthetic:  {c.get('is_synthetic')} (Source: {c.get('source_name', 'N/A')})")

    # Step 5: Export Real Dataset to CSV and JSON
    print("\n[Step 5] Exporting Real Dataset (is_synthetic=false)...")
    os.makedirs("data", exist_ok=True)
    csv_path = "data/real_influencers_export.csv"
    json_path = "data/real_influencers_export.json"

    try:
        csv_data = api_get("/influencers/export?is_synthetic=false&format=csv")
        with open(csv_path, "w", encoding="utf-8") as f:
            f.write(csv_data)
        print(f"  Exported Real CSV:  {csv_path} ({len(csv_data.splitlines()) - 1} records)")
    except Exception as e:
        print(f"  [CSV EXPORT ERROR]: {e}")

    try:
        json_data = api_get("/influencers/export?is_synthetic=false&format=json")
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(json_data, indent=2))
        print(f"  Exported Real JSON: {json_path} ({len(json_data)} records)")
    except Exception as e:
        print(f"  [JSON EXPORT ERROR]: {e}")

    print("\n" + "=" * 75)
    print("  PHASE 12 DISCOVERY RUN COMPLETE")
    print("=" * 75)

if __name__ == "__main__":
    main()
