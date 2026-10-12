# Windows Setup Guide — EDXSO AI Influencer Outreach System

This guide provides exact, step-by-step PowerShell commands to set up and run the FastAPI backend, MongoDB, and React frontend on Windows.

---

## 1. Prerequisites Check

Open **PowerShell** (as standard user or Administrator) and verify that Python and Node are installed:

```powershell
python --version
node --version
npm --version
```
> *Recommended: Python 3.10+ and Node.js 18+.*

---

## 2. Clone / Navigate to Workspace

```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach"
```

---

## 3. Environment Configuration

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Open `.env` in your text editor (e.g., VS Code or Notepad) and configure your keys:

```powershell
notepad .env
```

Key variables to review:
- `MONGODB_URI`: `"mongodb://localhost:27017"` *(If MongoDB is not installed locally, the backend automatically uses its built-in in-memory fallback adapter).*
- `YOUTUBE_API_KEY`: YouTube Data API v3 key from Google Cloud Console.
- `GEMINI_API_KEY`: API key from Google AI Studio.
- `SIMULATION_MODE`: `true` *(Safe default, prevents real email sending).*

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

## 5. Running Backend Automated Tests

Run the full Pytest test suite from the virtual environment:

```powershell
# Ensure you are in the backend directory with venv activated
pytest -v
```

All tests for configuration, data integrity schemas, health endpoints, pagination, and duplicate prevention will execute.

---

## 6. Starting the FastAPI Backend

Run the server using Uvicorn with hot reloading:

```powershell
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify the backend is live:
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Specification**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Root Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **API v1 Health Check**: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

## 7. Starting the Frontend (In a New PowerShell Window)

Open a second PowerShell window:

```powershell
cd "c:\Users\Sonu\OneDrive\Desktop\Micro-Influencer Outreach\frontend"
npm install
npm run dev
```

The frontend dashboard will be accessible at:
- [http://localhost:5173](http://localhost:5173)

---

## 8. Summary of Useful PowerShell Commands

| Action | PowerShell Command |
|---|---|
| Activate venv | `.\backend\venv\Scripts\Activate.ps1` |
| Run all tests | `pytest backend/tests/ -v` |
| Start backend | `uvicorn backend.app.main:app --reload --port 8000` |
| Start frontend | `cd frontend; npm run dev` |
| View health status | `Invoke-RestMethod http://127.0.0.1:8000/health` |
