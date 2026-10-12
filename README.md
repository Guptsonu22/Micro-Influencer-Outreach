# EDXSO AI Influencer Outreach System

A production-grade, end-to-end autonomous influencer discovery, qualification, AI personalization, and outreach platform built for the **EDXSO AI Engineer Intern Assignment 1**.

The system automates the end-to-end recruitment of **50+ YouTube micro-influencers (5k–100k subscribers)** in the **Technology & Artificial Intelligence** niche, verifies public metrics, evaluates brand fit against configurable rules, extracts verified contact emails, generates word-count compliant pitches via **Google Gemini 1.5 Flash**, and provides a multi-gated, auditable outreach sending layer.

---

## 📌 Project Overview & Problem Statement

In micro-influencer partnership programs, brands face three major hurdles:
1. **Manual Discovery Overhead**: Searching for relevant creators with genuine engagement is slow and error-prone.
2. **Generic, Impersonal Outreach**: Mass cold outreach leads to poor response rates; manual custom drafting cannot scale.
3. **Compliance & Safety Hazards**: Unregulated automation risks violating platform terms (e.g., Meta anti-spam policies) or sending accidental duplicate emails.

### The EDXSO Solution
- **Automated Real Discovery**: Batched multi-query YouTube Data API v3 search with recent video metrics hydration.
- **Explainable Brand-Fit Rules**: Transparent 4-axis classification (`pass`, `fail`, `needs_review`) with visible decision reasons.
- **Factual LLM Personalization**: Dual-format generation (strictly **60–90 words** for email, **15–30 words** for Instagram DM) backed strictly by verified video titles and bio themes, with zero hallucination.
- **7-Stage Outreach Gatekeeper**: Atomic duplicate locks, simulation mode by default, and Meta TOS compliance (manual copy workflow for Instagram).

---

## 🏗️ System Architecture & Workflow

```mermaid
flowchart TD
    A[YouTube Data API v3] -->|Search & Hydration| B[Discovery Engine]
    B -->|De-duplicate & Normalize| C[MongoDB / DAL Fallback]
    C -->|Rules Engine| D[4-Axis Classification]
    D -->|Technology Taxonomy| E[Profile Enrichment]
    E -->|Verified Bio Themes & Recent Video| F[Gemini 1.5 Flash Personalization]
    F -->|Email: 60-90w | DM: 15-30w| G[AI Message Studio]
    G -->|Review & Approval| H{7-Stage Gatekeeper}
    H -->|Simulation Mode Default| I[Simulated Delivery & Audit Log]
    H -->|Explicit Confirmation & SMTP| J[Live Delivery Provider]
    H -->|Meta TOS Safe| K[Instagram DM Manual Copy]
    I & J & K --> L[Outreach Tracker & CSV Export]
```

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend API** | Python 3.10+, FastAPI | Asynchronous REST endpoints, Pydantic v2 DTO validation |
| **Database** | MongoDB + Motor Async | Compound unique indexes for deduplication, plus in-memory DAL fallback |
| **AI Personalization** | Google Gemini 1.5 Flash | Structured JSON output, strict word-count boundaries, injection defense |
| **Video Discovery** | YouTube Data API v3 | Multi-query search, 50-channel batch details, recent upload metric sampling |
| **Email Delivery** | Python SMTP / Simulation | Default simulated provider with optional TLS SMTP integration |
| **Frontend UI** | React 18, Vite, TypeScript | 6 dedicated dashboard pages, Tailwind CSS, Lucide icons |
| **Testing** | Pytest, Node Test Runner | 49 backend unit/integration tests, 22 frontend validation tests |

---

## 📁 Repository Structure

```
├── .env.example                       # Environment variables template
├── .gitignore                         # Strict exclusion of .env, credentials, caches
├── README.md                          # Comprehensive documentation
├── run_backend.bat                    # One-click Windows backend launcher
├── run_frontend.bat                   # One-click Windows frontend launcher
├── run_all.bat                        # Launch full stack in dual terminals
├── run_all.ps1                        # PowerShell dual-service launcher
├── data/                              # Official assignment deliverables
│   ├── influencers_dataset.csv        # Tabular export (metrics, themes, emails, decision reasons)
│   ├── influencers_dataset.json       # Full structured JSON dataset
│   ├── outreach_tracker_history.csv   # Historical outreach delivery & audit log
│   └── sample_personalized_messages.json # Gemini drafts linked to actual creators
├── docs/                              # Architecture and setup manuals
│   ├── ARCHITECTURE.md                # Comprehensive architectural design
│   ├── API_DOCUMENTATION.md           # REST API endpoints, payloads, and examples
│   ├── WINDOWS_SETUP.md               # PowerShell setup instructions
│   └── GITHUB_PUBLICATION_CHECKLIST.md# Pre-push and submission checklist
├── screenshots/                       # Actual screenshots of running application
│   ├── overview_page.png              # System KPI metrics & pipeline status
│   ├── influencer_explorer_page.png   # Filterable creator table & decision reasons
│   ├── discovery_page.png             # YouTube search configuration & progress
│   ├── ai_message_studio_page.png     # Gemini copy editor & word count checkers
│   └── outreach_tracker_page.png      # 7-stage gatekeeper & CSV export
├── backend/                           # FastAPI backend
│   ├── requirements.txt               # Locked dependencies
│   ├── app/
│   │   ├── main.py                    # Entrypoint, CORS, exception handlers
│   │   ├── core/                      # Config, database, logging, exceptions
│   │   ├── models/                    # Pydantic persistence models
│   │   ├── schemas/                   # Validated request/response DTOs
│   │   ├── services/                  # Discovery, Filtering, LLM, Outreach, Email
│   │   └── api/v1/                    # Health, Creators, Discovery, Messages, Outreach
│   └── tests/                         # 49 passing automated tests
└── frontend/                          # React + Vite dashboard
    ├── package.json                   # Dependencies & npm scripts
    ├── vite.config.ts                 # Dev server & API proxy config
    └── src/
        ├── App.tsx                    # Shell layout with health banner
        ├── pages/                     # 6 dedicated dashboard pages
        └── services/api.ts            # Typed Axios/Fetch API client
```

---

## ⚡ Prerequisites

1. **Operating System**: Windows 10/11, macOS, or Linux.
2. **Python**: Python 3.10 to 3.14 (Official Windows Python installed).
3. **Node.js**: Node 18+ (tested on Node v24).
4. **MongoDB**: Optional (Local MongoDB on `localhost:27017` supported; the system automatically falls back to the built-in in-memory repository if MongoDB is offline).

---

## 🚀 Windows PowerShell Setup Guide

### 1. Clone & Configure Environment

```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach"

# Copy environment template
Copy-Item .env.example .env
```

Open `.env` and configure your keys:
- `YOUTUBE_API_KEY`: Google Cloud Console YouTube Data API v3 key *(leave empty for Demo Mode)*.
- `GEMINI_API_KEY`: Google AI Studio API key *(leave empty for offline Mock Provider)*.
- `SIMULATION_MODE=true`: Keep `true` for safe testing.

### 2. Launch the Backend Server

```powershell
# From project root:
.\run_backend.bat
```
*Or via direct Python command:*
```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe" -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health Diagnostics: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 3. Launch the React Frontend

In a second PowerShell window:
```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach\frontend"
npm install
npm run dev
```
- Dashboard URL: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Running Automated Tests

### Backend Test Suite (49 Tests)
```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach"
& "$env:LOCALAPPDATA\Programs\Python\Python314\python.exe" -m pytest backend/tests -v
```
**Results**: `49 passed in 3.24s (100% Pass Rate)`.

### Frontend Validation Suite (22 Tests)
```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach\frontend"
npm test
```
**Results**: `22 passed, 0 failed`.

### Production Build Verification
```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach\frontend"
npm run build
```
**Results**: `1,513 modules transformed, 0 errors, built in 18.58s`.

---

## 🔍 Data Provenance, Filtering Rules & Formulas

### 1. Micro-Influencer Follower Band
- **Target Band**: Exactly **5,000 to 100,000 subscribers**.
- **Hidden Counts**: Automatically flagged as `fail` with reason `"Subscriber count is hidden by channel creator"`.

### 2. Transparent Engagement Proxy Formula
$$\text{Engagement Rate} = \frac{\text{Average Likes} + \text{Average Comments}}{\text{Average Views}} \times 100$$
- **Window**: Sampled over the last 10 public uploads.
- **Missing Metrics**: If comments or likes are disabled on a video, the creator is flagged as `needs_review` rather than falsely penalized with 0%.

### 3. Contact Email Provenance
- Extracted using strict RFC 5322 regex from public video descriptions and channel 'About' bio text.
- If no email is publicly discoverable, it is strictly labeled `"Not Found"`. It is **never guessed or hallucinated**.

---

## 🤖 AI Personalization Engine & Prompts

### Gemini 1.5 Flash Constraints
- **Email Body**: Strictly **60 to 90 words**.
- **Instagram DM**: Strictly **15 to 30 words**.
- **Factual Grounding**: Pitches cite only verified content themes and actual recent video titles.
- **Prompt Injection Defense**: External bio text is wrapped inside `<untrusted_creator_content>` delimiters with a strict system instruction preventing instruction overriding.

---

## 🛡️ The 7-Stage Outreach Gatekeeper

Before any outreach email can be transmitted, it must pass 7 sequential gates:

1. **Qualification Gate**: Creator must be classified as `pass` (or have explicit `allow_ineligible_override=true`).
2. **Contact Email Gate**: Email must be non-empty and pass RFC syntax validation.
3. **Draft Gate**: A personalized draft must exist for the channel.
4. **Word Count Gate**: Email body must be between 60 and 90 words.
5. **Operator Approval Gate**: Live sending requires explicit user confirmation via the UI confirmation dialog.
6. **Duplicate Campaign Lock**: Checks `("campaign_id", "channel_id", "channel_type")` to prevent re-contacting the same creator.
7. **History Gate**: Scans prior outreach records to reject already contacted creators with HTTP 409 Conflict.

---

## 📦 Assignment Deliverables Directory

All required deliverables are generated and organized within the repository:

1. **`README.md`**: Complete documentation & user guide.
2. **`.env.example`**: Sanitized configuration template.
3. **`data/influencers_dataset.csv`**: Tabular export of the 50 creators with metrics, themes, emails, and decisions.
4. **`data/influencers_dataset.json`**: Full nested JSON export.
5. **`data/sample_personalized_messages.json`**: Sample Gemini pitches linked to their channel IDs.
6. **`data/outreach_tracker_history.csv`**: Outreach history log with delivery modes and statuses.
7. **`docs/API_DOCUMENTATION.md`**: REST API endpoints, schemas, and usage examples.
8. **`screenshots/`**: 5 actual PNG screenshots of the running dashboard.
9. **`workflow_verification_report.md`**: Comprehensive Phase 8 test audit report.
10. **`docs/GITHUB_PUBLICATION_CHECKLIST.md`**: Git pre-push and submission checklist.

---

## ⚠️ Known Limitations & Future Improvements

1. **YouTube API Quotas**: Free YouTube Data API keys are limited to 10,000 units/day. The system includes built-in batching (50 channels per call) to maximize quota efficiency.
2. **Email Verification**: Production deployments can plug into services like ZeroBounce or Hunter.io for MX/SMTP mailbox ping verification.
3. **Instagram DM Automation**: Blocked by design to respect Meta's Platform Terms of Service; future versions could integrate the official Instagram Graph API for approved business accounts.
