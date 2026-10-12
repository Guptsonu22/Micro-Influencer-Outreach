# EDXSO AI Influencer Outreach — REST API Documentation

Interactive Swagger documentation is served live at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **OpenAPI Schema**: [http://127.0.0.1:8000/api/v1/openapi.json](http://127.0.0.1:8000/api/v1/openapi.json)

---

## Base URLs & Protocols
- Local: `http://127.0.0.1:8000`
- API Prefix: `/api/v1`
- Content-Type: `application/json`

---

## Key Endpoints Reference

### 1. Health & System Diagnostics
- `GET /health` & `GET /api/v1/health`
  - Returns service status, MongoDB connectivity, API key configurations, and safety mode settings.

### 2. Influencer Exploration & Filtering
- `GET /api/v1/influencers`
  - Paginated list of creators.
  - Query parameters: `page`, `page_size`, `decision` (`pass` | `fail` | `needs_review`), `min_subscribers`, `max_subscribers`, `search_query`, `niche`.
- `GET /api/v1/influencers/{channel_id}`
  - Detailed creator profile including engagement metrics, content themes, public contacts, and decision reasons.
- `PATCH /api/v1/influencers/{channel_id}/contact`
  - Manually review or update business contact email with verification URL.
- `GET /api/v1/influencers/export?format=csv|json`
  - Streams full dataset export as tabular CSV or structured JSON.

### 3. Discovery Pipeline
- `POST /api/v1/discovery/run`
  - Triggers YouTube discovery run.
  - Body: `{"queries": ["AI tools", "Python tutorials"], "target_count": 50, "max_quota_budget": 2500, "force_mock": false}`.
- `GET /api/v1/discovery/runs`
  - Lists historical discovery runs, quotas consumed, and creators found.

### 4. AI Message Studio
- `POST /api/v1/messages/generate`
  - Generates email pitch (strictly 60–90 words) and Instagram DM (strictly 15–30 words) via Gemini 1.5 Flash.
  - Body: `{"channel_id": "UC...", "allow_ineligible_override": false, "force_mock": false}`.
- `GET /api/v1/messages`
  - Retrieves generated copy drafts.
- `PATCH /api/v1/messages/{message_id}`
  - Edits draft content or updates review status (`approved`, `rejected`).

### 5. Outreach Sending Layer & Gatekeeper
- `POST /api/v1/outreach/send`
  - Evaluates creator through the 7-stage pre-send gatekeeper and executes simulated or live delivery.
  - Body:
    ```json
    {
      "channel_id": "UC...",
      "campaign_id": "camp_default",
      "channel_type": "email",
      "is_live_requested": false,
      "confirmed_live_approval": false,
      "allow_ineligible_override": false
    }
    ```
- `GET /api/v1/outreach/instagram-dm/{channel_id}`
  - Returns Meta TOS-compliant manual copy package for Instagram DM.
- `GET /api/v1/outreach/logs`
  - Retrieves paginated audit logs of past outreach attempts.
- `GET /api/v1/outreach/export?format=csv|json`
  - Exports complete audit log with provider IDs and timestamps.
