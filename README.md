# EDXSO AI Influencer Outreach System

A production-quality prototype for the **EDXSO AI Engineer Intern Assignment 1: Automated Micro-Influencer Outreach System**.

This system automates the discovery of 50+ real YouTube micro-influencers, verifies public metrics, classifies creators with configurable brand-fit rules, enriches profiles with content themes and verified public contacts, and drafts personalized collaboration emails and Instagram DMs via Gemini LLM.

---

## 🏗️ Architecture & Tech Stack

- **Backend**: Python 3.10+, FastAPI, Pydantic v2, Motor (Async MongoDB driver), Uvicorn
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Database**: MongoDB (with local connection & seamless in-memory repository fallback for testing)
- **External APIs**:
  - **YouTube Data API v3**: Discovery of real micro-influencers, subscriber counts, and engagement sampling
  - **Google Gemini API**: Context-aware personalization of email pitches and Instagram DMs
- **Testing**: Pytest for backend tests and data integrity validation

---

## 🛡️ Mandatory Data Integrity & Safety Guardrails

1. **Zero Hallucination Policy**: Never invent creator names, channel statistics, engagement rates, or emails.
2. **Contact Provenance**: Contact emails that cannot be located are strictly tagged as `"Not Found"`.
3. **Engagement Formula Transparency**: Engagement rates are explicitly calculated and labeled with their exact formula:
   $$\text{Engagement Rate} = \frac{\text{Average Likes} + \text{Average Comments}}{\text{Average Views}} \times 100$$
4. **Synthetic Data Segregation**: A demo mode is provided for offline testing, but all demo records are explicitly marked with `is_synthetic: true` and are never intermingled with real discovery datasets.
5. **Anti-Bot & Terms Compliance**:
   - Instagram DMs are **strictly copy drafts only**; no automated private messaging bots are executed.
   - Live email sending is disabled by default (`SIMULATION_MODE=true`, `ALLOW_LIVE_EMAIL_SENDING=false`) and requires explicit approval.

---

## 📁 Project Structure

```
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions
├── README.md                 # Project documentation
├── backend/
│   ├── requirements.txt      # Python dependencies
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint & CORS middleware
│   │   ├── core/
│   │   │   ├── config.py     # Pydantic Settings & environment config
│   │   │   └── database.py   # Motor MongoDB client & repository layer
│   │   ├── models/
│   │   │   ├── creator.py    # Strict Pydantic domain models
│   │   │   └── campaign.py   # Filter criteria and campaign settings
│   │   └── api/
│   │       └── v1/
│   │           ├── router.py # API v1 router hub
│   │           └── health.py # Health check & telemetry endpoint
│   └── tests/
│       ├── test_health.py    # Health check & safety flags tests
│       └── test_models.py    # Data integrity & validation tests
└── frontend/
    ├── package.json          # Node dependencies
    ├── vite.config.ts        # Vite build & proxy config
    ├── tailwind.config.js    # Tailwind styling config
    ├── tsconfig.json         # TypeScript configuration
    ├── index.html            # HTML shell
    └── src/
        ├── App.tsx           # Dashboard UI
        ├── main.tsx          # React DOM entry
        ├── index.css         # Custom tokens & glassmorphism
        ├── types/            # TypeScript interfaces matching backend
        └── services/api.ts   # Typed API client
```

---

## 🚀 Quickstart Guide

### 1. Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
- `YOUTUBE_API_KEY`: YouTube Data API v3 key from Google Cloud Console
- `GEMINI_API_KEY`: API key from Google AI Studio
- `MONGODB_URI`: MongoDB connection string (defaults to `mongodb://localhost:27017`)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health check: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- App Dashboard: [http://localhost:5173](http://localhost:5173)

### 4. Running Backend Tests
```bash
cd backend
pytest -v
```

---

## 🗺️ Implementation Roadmap

- [x] **Phase 1: Project Architecture & Scaffolding** (Schemas, Motor DAL, Healthcheck, Vite+React frontend)
- [ ] **Phase 2: Creator Discovery & YouTube Data API v3 Integration** (Real channel search, sampling, metrics, synthetic generator)
- [ ] **Phase 3: Filtering & Brand-Fit Rule Engine** (Micro-influencer classification, transparent scoring & reasons)
- [ ] **Phase 4: Profile Enrichment & LLM Personalization** (Theme extraction, contact discovery, Gemini email & DM generator)
- [ ] **Phase 5: Outreach Tracking & Simulation Guardrails** (Review queue, simulated delivery, duplicate prevention)
- [ ] **Phase 6: Frontend UI & Interactive Dashboard** (Interactive discovery, creator drawer, campaign fit review, export)
- [ ] **Phase 7: Comprehensive Testing, Export Verification & Evaluation Delivery**
