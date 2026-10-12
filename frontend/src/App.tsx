import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Search,
  Sparkles,
  Database,
  Mail,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { SystemHealth } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';

export function App() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'discovery' | 'pipeline' | 'outreach'>('overview');

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setError(null);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner / Guardrail Indicator */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/60 border-b border-indigo-500/20 px-4 py-2 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-indigo-200">OUTREACH GUARDRAIL:</span>
          <span className="text-slate-300">
            {health?.safety_guardrails.simulation_mode ? 'Simulation Mode Active (Safe Testing)' : 'Live Email Sending Approved'}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Instagram DMs: Drafts Only (Anti-Bot Compliant)</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>MongoDB: <strong className="text-slate-200">{health?.database.status || 'Checking...'}</strong></span>
          <span>YouTube API: <strong className={health?.integrations.youtube_api_configured ? "text-emerald-400" : "text-amber-400"}>
            {health?.integrations.youtube_api_configured ? "Configured" : "Key Needed"}
          </strong></span>
          <span>Gemini AI: <strong className={health?.integrations.gemini_api_configured ? "text-emerald-400" : "text-amber-400"}>
            {health?.integrations.gemini_api_configured ? "Configured" : "Key Needed"}
          </strong></span>
        </div>
      </div>

      {/* Modular Navbar */}
      <Navbar
        health={health}
        loading={loadingHealth}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={fetchHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Error Notice */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">Backend Connection Notice</p>
              <p className="text-rose-200/80 text-xs mt-1">{error}</p>
              <p className="text-slate-400 text-xs mt-2">
                Make sure the FastAPI backend is running via <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300">uvicorn backend.app.main:app --reload</code>.
              </p>
            </div>
          </div>
        )}

        {/* Phase 1 Scaffolding & System Status Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* System Status Card */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Core Engine</span>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Phase 1 Active
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Architecture Foundation</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                FastAPI backend with Motor data-access layer, strict Pydantic schemas, and Vite/React dashboard.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Database Backend:</span>
                <span className="font-medium">{health?.database.status === 'connected' ? 'MongoDB (Local)' : 'In-Memory Fallback'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Discovered Creators:</span>
                <span className="font-medium text-indigo-300">{health?.database.total_records ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Target Discovered Pool:</span>
                <span className="font-medium text-emerald-400">50+ Real Creators</span>
              </div>
            </div>
          </div>

          {/* Guardrails & Safety Rules */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Compliance</span>
                <ShieldCheck className="h-4 w-4 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Data Integrity Rules</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Adhering strictly to assignment rules: zero fake emails, explicit 'Not Found', zero unauthorized bot automation.
              </p>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Real metrics sourced via YouTube API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Missing emails tagged strictly as <code className="text-amber-300">"Not Found"</code></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Synthetic demo records strictly segregated</span>
              </div>
            </div>
          </div>

          {/* Implementation Roadmap */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Roadmap</span>
                <Layers className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Phase Execution</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Step-by-step verified phases for assignment delivery.
              </p>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                <span>Phase 1: Project Scaffolding & Schemas</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">Current</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400">
                <span>Phase 2: YouTube Discovery (50+ Creators)</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-400">Next</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400">
                <span>Phase 3: Filtering & Brand-Fit Rule Engine</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-400">Queued</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Details & Next Step Guidance */}
        <div className="glass-panel p-8 rounded-2xl border border-indigo-500/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white">Phase 1 Complete: System Architecture Established</h3>
              <p className="text-sm text-slate-400 mt-1">
                The full project skeleton, MongoDB Motor repository, Pydantic schemas, safety toggles, and Vite frontend are initialized.
              </p>
            </div>
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shrink-0"
            >
              Open API Docs (Swagger)
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-400" />
                Backend Architecture
              </h4>
              <ul className="text-xs text-slate-400 space-y-2">
                <li>• <strong className="text-slate-300">FastAPI & Uvicorn:</strong> Async REST server with CORS & OpenAPI documentation.</li>
                <li>• <strong className="text-slate-300">Motor DAL:</strong> Async MongoDB data-access layer with fallback adapter and unique indexing on channel_id.</li>
                <li>• <strong className="text-slate-300">Pydantic Schemas:</strong> CreatorRecord with strict rules (<code className="text-amber-300">contact_email="Not Found"</code>, <code className="text-indigo-300">is_synthetic</code> flag).</li>
                <li>• <strong className="text-slate-300">Pytest Suite:</strong> Unit tests validating integrity defaults and health check contract.</li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-400" />
                Next Step: Phase 2 Kickoff
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                In Phase 2, we implement the <strong>YouTube Data API v3 Discovery Service</strong> to discover 50+ real micro-influencers with public channel metrics, plus a clearly-labeled synthetic generator for offline demonstration.
              </p>
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
                <span>Awaiting next prompt to proceed with Phase 2</span>
                <ArrowRight className="h-4 w-4 text-indigo-400" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-600">
        EDXSO AI Engineer Intern Assignment 1 • Automated Micro-Influencer Outreach System
      </footer>
    </div>
  );
}
export default App;
