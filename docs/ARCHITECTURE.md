# EDXSO Automated Micro-Influencer Outreach System — System Architecture

**Version:** 1.0.0  
**Target Milestone:** EDXSO AI Engineer Intern Assignment 1  
**Author:** AI Engineering & Architecture Team  

---

## 1. Executive Summary & Architecture Overview

The **EDXSO Automated Micro-Influencer Outreach System** is an end-to-end full-stack platform designed to systematically identify, evaluate, enrich, and contact YouTube micro-influencers (5k–100k subscribers). The system operates with strict data integrity: zero invented records, clear separation between real and synthetic data, transparent metric formulas, and default safety controls (simulated outreach, approval gates, and anti-bot compliance).

```mermaid
flowchart TD
    subgraph Client [Frontend - React / Vite / Tailwind]
        UI_Dash[Dashboard & KPI Overview]
        UI_Disc[Discovery & Search UI]
        UI_Pipe[Filter & Qualification Pipeline]
        UI_Out[Outreach Review & Approval Queue]
        UI_Exp[CSV / JSON Export Hub]
    end

    subgraph API_Gateway [Backend - FastAPI & Pydantic]
        Router[API v1 Router Hub]
        HealthEP[/api/v1/health]
        DiscEP[/api/v1/discovery]
        CreatEP[/api/v1/creators]
        MsgEP[/api/v1/messages]
        OutEP[/api/v1/outreach]
        ExpEP[/api/v1/export]
    end

    subgraph Services [Business Logic Layer]
        YT_Svc[YouTube Discovery Service]
        Met_Svc[Metric Calculation & Sampling Engine]
        Enr_Svc[Profile Enrichment & Heuristics]
        Fit_Svc[Brand-Fit Classification Engine]
        LLM_Svc[Gemini AI Copy Generator]
        Out_Svc[Outreach Simulation & Dispatch]
    end

    subgraph Persistence [Data Tier]
        Mongo[(MongoDB / In-Memory Adapter)]
        Coll_Creat[(creators)]
        Coll_Disc[(discovery_runs)]
        Coll_Camp[(campaigns)]
        Coll_Msg[(generated_messages)]
        Coll_Logs[(outreach_logs)]
    end

    subgraph External_APIs [Third-Party Integrations]
        YT_API[YouTube Data API v3]
        Gemini_API[Google Gemini 1.5 Flash]
        SMTP_Svc[Optional Approved SMTP Relay]
    end

    UI_Disc --> DiscEP
    UI_Pipe --> CreatEP
    UI_Out --> OutEP
    UI_Exp --> ExpEP

    DiscEP --> YT_Svc
    YT_Svc --> YT_API
    YT_Svc --> Met_Svc
    Met_Svc --> Enr_Svc
    Enr_Svc --> Fit_Svc
    Fit_Svc --> Coll_Creat

    MsgEP --> LLM_Svc
    LLM_Svc --> Gemini_API
    LLM_Svc --> Coll_Msg

    OutEP --> Out_Svc
    Out_Svc -.-> SMTP_Svc
    Out_Svc --> Coll_Logs
```

---

## 2. Frontend and Backend Responsibilities

### Frontend (React 18 + Vite + TypeScript + Tailwind CSS)
1. **Interactive Dashboard**: Real-time display of system health, active database engine, API quota indicators, and pipeline metrics.
2. **Discovery Hub**: Initiating live YouTube search discovery runs with keyword criteria, region selection, target creator count, and synthetic demo fallback toggle.
3. **Pipeline & Fit Review**: Table and grid view of discovered creators with search, niche filtering, qualification badges, and collapsible reason breakdowns.
4. **Creator Profile Drawer**: Detailed inspection of source metrics, recent video title samples, engagement calculations, and provenance timestamps.
5. **Outreach Approval Queue**: Two-pane interface for previewing and editing AI-generated collaboration emails and Instagram DMs before manual approval.
6. **Data Export Console**: One-click download of the complete qualified dataset in structured JSON and CSV formats.
7. **State Management & UI Safety**: Zero UI freezes during API runs, granular loading spinners, clear error banners, and disabled action buttons when keys are missing.

### Backend (Python 3.10+ + FastAPI + Pydantic v2 + Motor)
1. **API Router & Contract Enforcement**: Strict input validation and serialization using Pydantic schemas.
2. **YouTube Discovery Engine**: Paginated search across `search.list`, channel statistics hydration via `channels.list`, and recent video sampling via `videos.list`.
3. **Data Integrity & Metric Calculation**: Source-backed metrics with formula transparency, zero-data vs missing-data segregation, and timestamp tracking.
4. **Profile Enrichment**: Extracting public emails and external social handles from channel descriptions and about text using compliant regex heuristics.
5. **Brand-Fit Rule Engine**: Evaluating creator suitability against subscriber bands, engagement thresholds, niche keywords, and returning transparent qualification reason lists.
6. **Gemini LLM Copy Generation**: Prompt engineering providing campaign context, creator video samples, and tone instructions to generate personalized emails and Instagram DMs.
7. **Outreach Tracking & Safety Guardrails**: Simulation mode by default, duplicate contact prevention, audit logging, and approved live delivery controls.

---

## 3. API Endpoint Contracts

| Path | Method | Purpose | Request Body | Response Body |
|---|---|---|---|---|
| `/api/v1/health` | `GET` | System telemetry, DB status, API key verification, and safety flags | None | `SystemHealthResponse` |
| `/api/v1/discovery/run` | `POST` | Trigger discovery of micro-influencers | `DiscoveryRunCreate` | `DiscoveryRunResponse` |
| `/api/v1/discovery/runs` | `GET` | List past discovery runs | Query params (`limit`, `skip`) | `List[DiscoveryRunResponse]` |
| `/api/v1/creators` | `GET` | List discovered creators with filters | Query params (`is_qualified`, `is_synthetic`, `search_query`, `limit`) | `List[CreatorResponse]` |
| `/api/v1/creators/{channel_id}` | `GET` | Fetch single creator record | Path param `channel_id` | `CreatorResponse` |
| `/api/v1/creators/classify` | `POST` | Run or re-run qualification filter engine | `FilterCriteria` | `ClassificationBatchResult` |
| `/api/v1/messages/generate` | `POST` | Generate AI email & Instagram DM draft | `GenerateMessageRequest` | `GeneratedMessageResponse` |
| `/api/v1/messages/{message_id}` | `PUT` | Update/approve outreach message draft | `UpdateMessageRequest` | `GeneratedMessageResponse` |
| `/api/v1/outreach/simulate` | `POST` | Execute simulated outreach with audit logging | `OutreachExecuteRequest` | `OutreachLogResponse` |
| `/api/v1/outreach/send` | `POST` | Approved live email sending (gated by config) | `OutreachExecuteRequest` | `OutreachLogResponse` |
| `/api/v1/outreach/logs` | `GET` | List outreach audit trail | Query params (`limit`) | `List[OutreachLogResponse]` |
| `/api/v1/export/json` | `GET` | Download dataset as structured JSON | Query params (`only_qualified`) | JSON stream / file download |
| `/api/v1/export/csv` | `GET` | Download dataset as CSV | Query params (`only_qualified`) | CSV stream / file download |

---

## 4. MongoDB Collections and Indexes

The database uses the `edxso_influencer_outreach` database with 5 collections:

### 1. `creators`
Stores influencer profiles, source metrics, enrichment data, classification results, and current outreach copy.
- **Indexes:**
  - `channel_id` (Unique, Ascending) — Enforces duplicate prevention.
  - `is_synthetic` (Ascending) — Segregates synthetic demo records from real API data.
  - `classification.is_qualified` (Ascending) — Accelerates filtering for qualified pipelines.
  - `metrics.subscriber_count` (Ascending) — For subscriber band querying.
  - `retrieved_at` (Descending) — For time-series queries.

### 2. `discovery_runs`
Tracks discovery executions, queries used, quota consumed, and counts.
- **Indexes:**
  - `run_timestamp` (Descending)
  - `status` (Ascending)

### 3. `campaigns`
Stores brand profiles, value propositions, compensation terms, and qualification rules.
- **Indexes:**
  - `name` (Ascending)

### 4. `generated_messages`
Stores versioned email and Instagram DM drafts generated by the LLM.
- **Indexes:**
  - `creator_id` (Ascending)
  - `channel_id` (Ascending)
  - `status` (Ascending)

### 5. `outreach_logs`
Immutable audit log of all simulated and sent messages.
- **Indexes:**
  - `channel_id` + `channel_type` (Compound Ascending) — Fast duplicate prevention check.
  - `timestamp` (Descending)

---

## 5. Domain Schemas & Field Definitions

### Influencer / Creator Record
```json
{
  "channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
  "title": "Google Cloud Tech",
  "custom_url": "@googlecloudtech",
  "channel_url": "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
  "description": "Welcome to the official Google Cloud channel...",
  "published_at": "2010-09-24T18:42:00Z",
  "country": "US",
  "thumbnail_url": "https://yt3.ggpht.com/...",
  "metrics": {
    "subscriber_count": 84500,
    "is_subscriber_count_hidden": false,
    "video_count": 420,
    "view_count": 14205000,
    "recent_video_sample_size": 10,
    "avg_recent_views": 8500.0,
    "avg_recent_likes": 320.0,
    "avg_recent_comments": 45.0,
    "estimated_engagement_rate": 4.29,
    "engagement_formula_used": "((avg_likes + avg_comments) / avg_views) * 100",
    "metric_timestamp": "2026-10-12T10:00:00Z"
  },
  "enrichment": {
    "contact_email": "partnerships@example.com",
    "email_source": "channel_description_or_links",
    "social_links": {
      "instagram": "https://instagram.com/cloudtech",
      "twitter": "https://x.com/cloudtech"
    },
    "content_themes": ["Cloud Architecture", "DevOps", "AI Deployment"],
    "recent_video_titles": [
      "Building Serverless Apps with Python",
      "Deploying LLMs on Kubernetes"
    ],
    "audience_demographics": "Unavailable",
    "enriched_at": "2026-10-12T10:01:00Z"
  },
  "classification": {
    "is_qualified": true,
    "fit_score": 88,
    "niche": "Cloud & AI Engineering",
    "reasons": [
      "Subscriber count (84,500) within 5,000 - 100,000 micro-tier",
      "Engagement rate (4.29%) exceeds minimum 2.0% threshold",
      "Bio and recent uploads match required keywords: 'python', 'ai'"
    ],
    "evaluated_at": "2026-10-12T10:02:00Z"
  },
  "outreach": {
    "email_subject": "EDXSO x Google Cloud Tech: Hands-on AI Workshop Partnership",
    "email_body": "Hi team, loved your recent tutorial on 'Deploying LLMs on Kubernetes'...",
    "instagram_dm": "Hey! Loved your recent Python LLM guide. Would love to collaborate with EDXSO on our upcoming developer workbench...",
    "status": "draft",
    "is_simulation": true,
    "error_message": null
  },
  "is_synthetic": false,
  "source_api": "YouTube Data API v3",
  "retrieved_at": "2026-10-12T10:00:00Z",
  "updated_at": "2026-10-12T10:02:00Z"
}
```

---

## 6. Data Provenance, Freshness & Integrity Fields

| Field | Type | Integrity Rule |
|---|---|---|
| `channel_id` | String | Immutable primary identifier from YouTube |
| `source_api` | String | Fixed provenance source (e.g. `YouTube Data API v3`) |
| `retrieved_at` | DateTime (UTC) | Exact timestamp of initial discovery |
| `metric_timestamp` | DateTime (UTC) | Exact timestamp when view/subscriber stats were sampled |
| `is_synthetic` | Boolean | `True` ONLY for demo records; `False` for all real YouTube data |
| `contact_email` | String | Discovered email, or strictly `"Not Found"` if absent |
| `audience_demographics` | String | Strictly `"Unavailable"` (as YouTube API does not publish third-party audience demographics) |
| `engagement_formula_used`| String | Explicitly documents the formula applied |

---

## 7. Public Contact Email & Demographics Policy

### YouTube Data API Limitations
1. **Contact Emails**: YouTube intentionally protects creator privacy and does not expose private business inquiry email addresses through public Data API v3 channel endpoints.
2. **Audience Demographics**: Private viewer analytics (age distributions, geographic breakdown, gender) are only accessible to the channel owner through the authenticated YouTube Analytics API; they are **never** accessible to third parties.

### Permitted Public Enrichment Approach
1. **Public Description Scanning**: Regex scan of the public channel `description` and recent video descriptions for declared business inquiry addresses.
2. **Social Handles Extraction**: Heuristic parsing of links to external platforms (Instagram, Twitter/X, GitHub, LinkedIn, Personal Portfolios).
3. **Mandatory Unavailability Labels**:
   - If no public contact email is listed in public text: set field strictly to `"Not Found"` (never invent or guess an email).
   - For audience demographics: set field strictly to `"Unavailable"` with source note.
4. **No Unauthorized Scraping**: The system does not bypass CAPTCHAs, automated login walls, or reverse-engineer YouTube private endpoints.

---

## 8. Strategy to Collect 50+ Real Profiles

To fulfill the assignment requirement of discovering at least 50 real micro-influencers without exceeding API quota limits:

1. **Targeted Multi-Query Strategy**:
   - Queries: `"AI engineering tutorial"`, `"Python developer tips"`, `"Machine learning beginner guide"`, `"Full stack coding project"`.
2. **Search API with Pagination**:
   - Execute `search.list` with `type=channel` (or `type=video`), `maxResults=50`, and use `nextPageToken` to retrieve up to 75 candidates per topic.
3. **Batch Channel Details Hydration**:
   - Aggregate channel IDs into batches of up to 50 and call `channels.list` with `part=snippet,statistics` in a single request. This conserves YouTube API quota (each batch of 50 channels consumes only 1 quota unit).
4. **Recent Video Metric Sampling**:
   - For each candidate channel, retrieve the last 10 uploads using `playlistItems.list` against the channel's `uploads` playlist (only 1 quota unit) and hydrate video statistics with `videos.list`.
   - Calculate average views, likes, and comments.
5. **Deduplication**:
   - The unique MongoDB index on `channel_id` ensures channels discovered across multiple queries are deduplicated automatically.

---

## 9. Error-Handling & Resilience Strategy

1. **API Quota Management**:
   - Daily quota monitoring for YouTube API (10,000 units/day default limit).
   - If quota is exhausted (HTTP 403 `quotaExceeded`), the system throws a structured `APIQuotaExhaustedError` and alerts the user without crashing or falsifying data.
2. **Database Resilience**:
   - If MongoDB is unreachable on startup, the application seamlessly activates an **In-Memory Repository Adapter** with full CRUD capability, clearly labeling `database.status: "in_memory_mode"` in `/api/v1/health`.
3. **Outreach Safeguards**:
   - Live email sending is blocked by default (`SIMULATION_MODE=true`, `ALLOW_LIVE_EMAIL_SENDING=false`).
   - Duplicate prevention checks occur before any outreach simulation or delivery.
   - Instagram DMs are copy drafts only—no automated private messaging is performed.

---

## 10. Testing Strategy

1. **Unit Tests (`backend/tests/`)**:
   - `test_models.py`: Validates Pydantic defaults, `"Not Found"` enforcement, and synthetic flag separation.
   - `test_health.py`: Validates system telemetry and safety flag status.
   - `test_utils.py`: Validates email extraction regex and engagement rate formula rounding.
2. **Integration Tests**:
   - Mocked YouTube API responses to verify 50-item batching, pagination, and error handling.
   - Filter engine classification tests against diverse creator subscriber/engagement profiles.
3. **Frontend Component Tests**:
   - Verification of loading, empty, and error states across all dashboard views.
