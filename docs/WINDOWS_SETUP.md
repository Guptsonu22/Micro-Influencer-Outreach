# Windows Setup & Execution Guide — EDXSO AI Influencer Outreach System

This guide provides exact, step-by-step PowerShell commands to set up, test, build, and run the FastAPI backend, MongoDB, and React frontend together on Windows.

---

## 1. Prerequisites Check

Open **PowerShell** and verify that Python and Node are installed:

```powershell
python --version
node --version
npm --version
```
> *Recommended: Python 3.10+ and Node.js 18+ (tested with React 18, Vite 5, Tailwind CSS).*

---

## 2. Navigate to Project Workspace

```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach"
```

---

## 3. Environment Configuration

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` in your text editor:

```powershell
notepad .env
```

Configure your credentials:
- `MONGODB_URI`: `"mongodb://localhost:27017"` *(If MongoDB is not installed locally, the backend automatically uses its built-in in-memory fallback adapter).*
- `YOUTUBE_API_KEY`: YouTube Data API v3 key from Google Cloud Console.
- `GEMINI_API_KEY`: API key from Google AI Studio.
- `SIMULATION_MODE`: `true` *(Default safe dry-run mode, prevents unintended email sending).*
- `ALLOW_LIVE_EMAIL_SENDING`: `false` *(Default safe safety gate).*

---

## 4. Backend Setup & Virtual Environment

Create and activate a Python virtual environment:

```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment named 'venv'
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1

# (If PowerShell blocks script execution, run: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned)

# 4. Upgrade pip and install dependencies
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 5. Running Automated Backend & Frontend Tests

### A. Run Backend Pytest Suite (10 test suites covering all 5 core modules)
```powershell
# From backend directory with venv activated:
pytest -v
```

### B. Run Frontend Validation Tests
```powershell
# From project root:
cd ..\frontend
npm run test
```

---

## 6. Running Frontend Build & Typecheck

Verify that the frontend builds cleanly with zero TypeScript errors:

```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach\frontend"
npm install
npm run build
```

---

## 7. Running Backend & Frontend Together on Windows

To run both servers concurrently, use two PowerShell windows:

### Terminal 1: FastAPI Backend
```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach\backend"
.\venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **System Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

### Terminal 2: React Frontend (Vite)
```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach\frontend"
npm run dev
```
- **Dashboard UI**: [http://localhost:5173](http://localhost:5173)

*(Vite proxies all `/api` requests automatically to `http://127.0.0.1:8000`)*

---

## 8. Dashboard Pages Overview

The frontend dashboard provides 6 dedicated pages:

1. **Overview**: Real-time KPI counters (real vs demo records, pass/review/fail breakdown, missing contact emails, generated message counts, and latest discovery attrition report).
2. **Influencer Explorer**: Faceted search, filtering by niche/subscribers/classification, metrics sorting, paginated cards, detail drawer with full qualification reasons, and manual business email verification editor.
3. **Discovery**: Multi-query search configuration, target count slider (50+ creators), quota budget control, demo mode toggle, concurrent run duplicate lock, and historical discovery runs table.
4. **AI Message Studio**: Two-pane editor for personalized email pitch (strictly 60–90 words) and Instagram DM (strictly 15–30 words), live word count indicators, personalization source evidence box, draft approval/rejection, and ineligible creator safety gate override.
5. **Outreach Tracker**: Audit logs table, status filter (`simulated`, `sent`, `failed`), test outreach dispatch simulator, duplicate prevention lock, and CSV export.
6. **Settings**: Non-secret credentials inspection, step-by-step setup instructions for YouTube and Gemini API keys, and campaign value-proposition preferences editor.

---

## 9. Summary of Useful Commands

| Action | PowerShell Command |
|---|---|
| Activate venv | `.\backend\venv\Scripts\Activate.ps1` |
| Run all backend tests | `pytest backend/tests/ -v` |
| Build frontend bundle | `cd frontend; npm run build` |
| Start backend server | `uvicorn backend.app.main:app --reload --port 8000` |
| Start frontend dev server | `cd frontend; npm run dev` |
| Quick health check | `Invoke-RestMethod http://127.0.0.1:8000/health` |

---

## 10. Secure Live Sending Configuration & 7-Stage Gatekeeper Guide

### ⚠️ Safe Default: Simulation Mode
By default, `SIMULATION_MODE=true` and `ALLOW_LIVE_EMAIL_SENDING=false`.
In this mode, all dispatches execute through the `SimulationEmailProvider`, generating realistic simulated message IDs (`sim_...`), recording persistent logs, and verifying duplicate constraints **without sending real emails or consuming mail server quotas**.

### 🛡️ The 7 Mandatory Pre-Send Gates
Before any email dispatch can succeed, the candidate must pass all 7 gates:
1. **Qualification Gate**: Creator must have `pass` classification status, or the operator must check `allow_ineligible_override`.
2. **Contact Email Gate**: A verified, RFC-compliant email address must exist (never `"Not Found"` or placeholder).
3. **Personalized Draft Gate**: A generated email draft must exist for the creator in the database.
4. **Word Count & Content Gate**: The body must contain strictly **60–90 words** and pass content injection checks.
5. **Operator Approval Gate**: Live sending requires explicit operator confirmation via the two-step confirmation modal.
6. **Campaign + Creator Duplicate Gate**: The database atomically verifies that no outreach exists for `(campaign_id, channel_id, channel_type)`.
7. **History Audit Gate**: Prior contact history is verified prior to provider invocation.

### ⚙️ How to Configure Live Sending Securely (When Approved)
To configure live sending for production deployment:
1. Open `.env` (never commit `.env` to version control; it is included in `.gitignore`):
   ```env
   SIMULATION_MODE=false
   ALLOW_LIVE_EMAIL_SENDING=true

   # Configure dedicated SMTP relay (e.g. Amazon SES, SendGrid, Postmark, Mailgun)
   SMTP_HOST="smtp.sendgrid.net"
   SMTP_PORT=587
   SMTP_USERNAME="apikey"
   SMTP_PASSWORD="YOUR_ACTUAL_SENDGRID_API_KEY"
   SMTP_FROM_EMAIL="partnerships@yourverifieddomain.com"
   SMTP_FROM_NAME="EDXSO Partnerships"
   ```
2. For **Gmail SMTP**:
   - Enable 2-Factor Authentication on your Google Account.
   - Generate an **App Password** at `myaccount.google.com/apppasswords`.
   - Set `SMTP_HOST="smtp.gmail.com"`, `SMTP_PORT=587`, `SMTP_USERNAME="your-email@gmail.com"`, and `SMTP_PASSWORD="your-16-char-app-password"`.
   - Never use your personal Google account password.
3. **Instagram Direct Messages**:
   - Direct message automation is forbidden by Meta Platform Terms of Service.
   - Instagram DMs in this system use the **Manual Copy Workflow**: the system drafts personalized 15–30 word copy that operators review and copy to clipboard to send manually via official Instagram apps. Automated bot sending is blocked.
