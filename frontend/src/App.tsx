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
  ArrowRight,
  Download,
  Play,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  FileCode,
  Eye,
  Edit3,
  Clock,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { SystemHealth } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { MetricsBadge } from './components/MetricsBadge';

export function App() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'discovery' | 'pipeline' | 'outreach'>('overview');

  // Discovery State
  const [targetCount, setTargetCount] = useState<number>(50);
  const [quotaBudget, setQuotaBudget] = useState<number>(2500);
  const [useDemoMode, setUseDemoMode] = useState<boolean>(false);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([
    "AI tools tutorials",
    "Machine learning tutorials",
    "Software development",
    "Programming education"
  ]);
  const [runningDiscovery, setRunningDiscovery] = useState<boolean>(false);
  const [discoverySummary, setDiscoverySummary] = useState<any | null>(null);
  const [creators, setCreators] = useState<any[]>([]);
  const [loadingCreators, setLoadingCreators] = useState<boolean>(false);

  // Pipeline & Filter State
  const [minSubs, setMinSubs] = useState<number>(5000);
  const [maxSubs, setMaxSubs] = useState<number>(100000);
  const [minEng, setMinEng] = useState<number>(2.0);
  const [requireEmail, setRequireEmail] = useState<boolean>(false);
  const [requireEng, setRequireEng] = useState<boolean>(false);
  const [runningClassification, setRunningClassification] = useState<boolean>(false);
  const [classificationSummary, setClassificationSummary] = useState<any | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<string>('all');

  // Inspector Modal State
  const [selectedCreator, setSelectedCreator] = useState<any | null>(null);
  const [manualEmailInput, setManualEmailInput] = useState<string>('');
  const [savingEmail, setSavingEmail] = useState<boolean>(false);
  const [enrichingCreator, setEnrichingCreator] = useState<boolean>(false);

  const availableQueries = [
    "AI tools tutorials",
    "Machine learning tutorials",
    "Software development",
    "Programming education",
    "Developer productivity",
    "Generative AI tutorials"
  ];

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

  const fetchCreators = async (filterDec?: string) => {
    setLoadingCreators(true);
    try {
      const dec = filterDec === 'all' ? undefined : filterDec;
      const data = await api.getCreators({ page: 1, page_size: 100, decision: dec });
      setCreators(data.items || []);
    } catch (err: any) {
      console.error("Failed to load creators:", err);
    } finally {
      setLoadingCreators(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchCreators();
  }, []);

  const toggleQuery = (q: string) => {
    if (selectedQueries.includes(q)) {
      if (selectedQueries.length > 1) {
        setSelectedQueries(selectedQueries.filter(item => item !== q));
      }
    } else {
      setSelectedQueries([...selectedQueries, q]);
    }
  };

  const handleRunDiscovery = async () => {
    setRunningDiscovery(true);
    setError(null);
    try {
      const res = await api.triggerDiscovery({
        queries: selectedQueries,
        target_count: targetCount,
        max_quota_budget: quotaBudget,
        min_subscribers: minSubs,
        max_subscribers: maxSubs,
        region_code: 'US',
        use_demo_mode: useDemoMode,
      });
      setDiscoverySummary(res.summary);
      await fetchCreators(decisionFilter);
      await fetchHealth();
    } catch (err: any) {
      setError(err.message || 'Discovery run failed.');
    } finally {
      setRunningDiscovery(false);
    }
  };

  const handleRunClassification = async () => {
    setRunningClassification(true);
    setError(null);
    try {
      const res = await api.classifyAll({
        min_subscribers: minSubs,
        max_subscribers: maxSubs,
        min_engagement_rate: minEng,
        target_niches: ["Technology & Artificial Intelligence"],
        require_contact_email: requireEmail,
        require_engagement_rate: requireEng
      });
      setClassificationSummary(res);
      await fetchCreators(decisionFilter);
    } catch (err: any) {
      setError(err.message || 'Classification failed.');
    } finally {
      setRunningClassification(false);
    }
  };

  const handleManualEmailSave = async () => {
    if (!selectedCreator || !manualEmailInput) return;
    setSavingEmail(true);
    try {
      const updated = await api.updateContactEmail(selectedCreator.channel_id, manualEmailInput);
      setSelectedCreator(updated);
      await fetchCreators(decisionFilter);
    } catch (err: any) {
      alert(err.message || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTriggerEnrich = async () => {
    if (!selectedCreator) return;
    setEnrichingCreator(true);
    try {
      const updated = await api.enrichSingle(selectedCreator.channel_id);
      setSelectedCreator(updated);
      await fetchCreators(decisionFilter);
    } catch (err: any) {
      alert(err.message || 'Enrichment failed');
    } finally {
      setEnrichingCreator(false);
    }
  };

  const getDecisionBadge = (decision: string) => {
    if (decision === 'pass') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> PASS
        </span>
      );
    }
    if (decision === 'needs_review') {
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold text-[11px] flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> NEEDS REVIEW
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold text-[11px] flex items-center gap-1">
        <XCircle className="h-3 w-3" /> FAIL
      </span>
    );
  };

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
        onRefresh={() => {
          fetchHealth();
          fetchCreators(decisionFilter);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Error Notice */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">Notice</p>
              <p className="text-rose-200/80 text-xs mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* System Status Card */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Core Engine</span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Phase 4 Active
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Architecture Foundation</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Brand-fit filtering engine, separate criterion classification, theme extraction, and public contact verification.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Database Backend:</span>
                    <span className="font-medium">{health?.database.status === 'connected' ? 'MongoDB (Local)' : 'In-Memory Fallback'}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Discovered Creators:</span>
                    <span className="font-medium text-indigo-300">{health?.database.total_records ?? creators.length}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Niche Pipeline:</span>
                    <span className="font-medium text-emerald-400">Technology & AI Complete</span>
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
                    <span>Demographics marked strictly as <code className="text-slate-300">"Unavailable"</code></span>
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
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                    <span>Phase 1-3: Scaffolding, Backend, Discovery</span>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                    <span>Phase 4: Filtering & Enrichment</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">Current</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400">
                    <span>Phase 5: LLM Copy & Simulation Queue</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-400">Next</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Hero */}
            <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Review Creator Pipeline & Fit Criteria</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Evaluate discovered profiles across Niche, Followers, Engagement, and Contact Availability with granular reasons.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('pipeline')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shrink-0 shadow-lg shadow-indigo-600/30"
              >
                Go to Pipeline Engine
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DISCOVERY */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Search className="h-5 w-5 text-indigo-400" />
                    YouTube Micro-Influencer Discovery Engine
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Searches public YouTube content, deduplicates canonical channel IDs, hydrates statistics in batches, and samples recent uploads.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={api.getExportUrl('csv')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    Export CSV
                  </a>
                  <a
                    href={api.getExportUrl('json')}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                    Export JSON
                  </a>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    Search Queries (Tech & AI Niche):
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableQueries.map((q) => {
                      const isSelected = selectedQueries.includes(q);
                      return (
                        <button
                          key={q}
                          type="button"
                          onClick={() => toggleQuery(q)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isSelected ? <Check className="h-3 w-3 text-indigo-400" /> : null}
                          {q}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Target Discovered Creators:</span>
                      <span className="font-bold text-indigo-300">{targetCount}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={targetCount}
                      onChange={(e) => setTargetCount(Number(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Offline Demo Mode</p>
                      <p className="text-[10px] text-slate-400">Generate clearly-labeled synthetic records without API key</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={useDemoMode}
                      onChange={(e) => setUseDemoMode(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleRunDiscovery}
                    disabled={runningDiscovery}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20"
                  >
                    {runningDiscovery ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Running Discovery Pipeline...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Run Discovery Pipeline
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Discovery Execution Summary Card */}
            {discoverySummary && (
              <div className="glass-panel p-6 rounded-2xl border border-indigo-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Discovery Run Summary
                  </h3>
                  <span className="text-xs text-slate-400">
                    Quota Used: <strong className="text-indigo-300">{discoverySummary.quota_units_used} units</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Total Results</span>
                    <p className="text-lg font-bold text-white mt-1">{discoverySummary.total_search_results}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Unique Channels</span>
                    <p className="text-lg font-bold text-white mt-1">{discoverySummary.unique_channels_found}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <span className="text-[10px] uppercase font-semibold text-emerald-400">Qualifying (5k–100k)</span>
                    <p className="text-lg font-bold text-emerald-300 mt-1">{discoverySummary.qualifying_channels}</p>
                  </div>
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <span className="text-[10px] uppercase font-semibold text-amber-400">Rejected Channels</span>
                    <p className="text-lg font-bold text-amber-300 mt-1">{discoverySummary.rejected_channels}</p>
                  </div>
                </div>

                {discoverySummary.continuation_instructions && (
                  <p className="text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-500/20 p-3 rounded-xl mt-3">
                    💡 {discoverySummary.continuation_instructions}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PIPELINE & BRAND-FIT CLASSIFICATION */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            {/* Filter Configuration Bar */}
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-indigo-400" />
                    Brand-Fit Classification Engine (Tech & AI)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluates creators across Niche Relevance, Followers, Engagement, and Contact Availability. Stores reasons for every decision.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRunClassification}
                    disabled={runningClassification}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${runningClassification ? 'animate-spin' : ''}`} />
                    Run Classification Rules
                  </button>
                  <a
                    href={api.getExportUrl('csv', decisionFilter === 'all' ? undefined : decisionFilter)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                    Export
                  </a>
                </div>
              </div>

              {/* Dynamic Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Min Followers: <strong className="text-indigo-300">{minSubs.toLocaleString()}</strong>
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="20000"
                    step="1000"
                    value={minSubs}
                    onChange={(e) => setMinSubs(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Max Followers: <strong className="text-indigo-300">{maxSubs.toLocaleString()}</strong>
                  </label>
                  <input
                    type="range"
                    min="50000"
                    max="250000"
                    step="5000"
                    value={maxSubs}
                    onChange={(e) => setMaxSubs(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Min Engagement Rate: <strong className="text-indigo-300">{minEng}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="8.0"
                    step="0.5"
                    value={minEng}
                    onChange={(e) => setMinEng(Number(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireEmail}
                      onChange={(e) => setRequireEmail(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    Require Verified Email (Mandatory)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireEng}
                      onChange={(e) => setRequireEng(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                    />
                    Require Engagement (Fail if missing)
                  </label>
                </div>
              </div>
            </div>

            {/* Criteria Counters & Breakdown Card */}
            {classificationSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase">
                    <span>Passed</span>
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-300 mt-2">{classificationSummary.passed_count}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase">
                    <span>Needs Review</span>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-amber-300 mt-2">{classificationSummary.needs_review_count}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border-rose-500/20 bg-rose-500/5">
                  <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase">
                    <span>Failed</span>
                    <XCircle className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-rose-300 mt-2">{classificationSummary.failed_count}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border-indigo-500/20 bg-indigo-500/5">
                  <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold uppercase">
                    <span>Niche Matches</span>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-indigo-300 mt-2">
                    {classificationSummary.criterion_pass_counts?.niche_relevance ?? 0}
                  </p>
                </div>
              </div>
            )}

            {/* Pipeline Table with Filter Tabs */}
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
                <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                  {['all', 'pass', 'needs_review', 'fail'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setDecisionFilter(tab);
                        fetchCreators(tab);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                        decisionFilter === tab
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <span className="text-xs text-slate-400">
                  Showing <strong className="text-slate-200">{creators.length}</strong> evaluated profiles
                </span>
              </div>

              {loadingCreators ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  Loading pipeline profiles...
                </div>
              ) : creators.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No creators found for this status. Run discovery or change the filter tab!
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="pb-3">Creator</th>
                        <th className="pb-3">Followers</th>
                        <th className="pb-3">Niche Fit</th>
                        <th className="pb-3">Engagement</th>
                        <th className="pb-3">Contact</th>
                        <th className="pb-3">Decision</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {creators.map((c: any) => {
                        const classif = c.classification || {};
                        const dec = classif.decision || (classif.is_qualified ? 'pass' : 'fail');
                        return (
                          <tr key={c.channel_id} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2.5">
                                {c.thumbnail_url ? (
                                  <img
                                    src={c.thumbnail_url}
                                    alt={c.title}
                                    className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-700"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                                    {c.title.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-slate-200">{c.title}</p>
                                  <span className="text-[10px] text-slate-400">{c.custom_url}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 pr-4">
                              {c.metrics?.is_subscriber_count_hidden ? (
                                <span className="text-slate-500 italic">Hidden</span>
                              ) : c.metrics?.subscriber_count ? (
                                <strong className="text-slate-200">{c.metrics.subscriber_count.toLocaleString()}</strong>
                              ) : (
                                <span className="text-slate-500">N/A</span>
                              )}
                            </td>

                            <td className="py-3 pr-4">
                              <span className="text-indigo-300 font-medium">
                                {classif.fit_score ?? 50}/100
                              </span>
                            </td>

                            <td className="py-3 pr-4">
                              {c.metrics?.estimated_engagement_rate ? (
                                <span className="text-emerald-400 font-medium">
                                  {c.metrics.estimated_engagement_rate}%
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Unavailable</span>
                              )}
                            </td>

                            <td className="py-3 pr-4">
                              {c.enrichment?.contact_email === 'Not Found' ? (
                                <span className="text-slate-500 italic">Not Found</span>
                              ) : (
                                <span className="text-slate-300 font-mono text-[11px] truncate block max-w-[140px]">
                                  {c.enrichment?.contact_email}
                                </span>
                              )}
                            </td>

                            <td className="py-3 pr-4">
                              {getDecisionBadge(dec)}
                            </td>

                            <td className="py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedCreator(c);
                                  setManualEmailInput(c.enrichment?.contact_email !== 'Not Found' ? c.enrichment?.contact_email : '');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition inline-flex items-center gap-1.5"
                              >
                                <Eye className="h-3 w-3 text-indigo-400" />
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: OUTREACH (Scheduled for Phase 5) */}
        {activeTab === 'outreach' && (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <Mail className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">Outreach Review & Simulation Queue</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
              AI-generated personalized emails and Instagram DM drafts with approval gates. (Scheduled for Phase 5).
            </p>
          </div>
        )}
      </main>

      {/* INSPECTOR & ENRICHMENT MODAL */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                {selectedCreator.thumbnail_url ? (
                  <img
                    src={selectedCreator.thumbnail_url}
                    alt={selectedCreator.title}
                    className="h-12 w-12 rounded-full object-cover border border-slate-700"
                  />
                ) : null}
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedCreator.title}
                    <a
                      href={selectedCreator.channel_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-indigo-400 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </h3>
                  <p className="text-xs text-slate-400">{selectedCreator.custom_url} • {selectedCreator.channel_id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCreator(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Classification Decision & Reasons */}
            <div className="my-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Brand-Fit Decision:</span>
                {getDecisionBadge(selectedCreator.classification?.decision || 'needs_review')}
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 mt-3">
                {selectedCreator.classification?.reasons?.map((reason: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Metrics Provenance Card */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <MetricsBadge
                label="Subscribers"
                value={selectedCreator.metrics?.subscriber_count?.toLocaleString()}
                isUnavailable={selectedCreator.metrics?.is_subscriber_count_hidden}
              />
              <MetricsBadge
                label="Est. Engagement"
                value={selectedCreator.metrics?.estimated_engagement_rate}
                unit="%"
                isUnavailable={!selectedCreator.metrics?.estimated_engagement_rate}
              />
              <MetricsBadge
                label="Observation Window"
                value="Last 10 Uploads"
              />
            </div>

            {/* Content Themes & Titles */}
            <div className="mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase text-slate-400">Content Themes</h4>
                <button
                  onClick={handleTriggerEnrich}
                  disabled={enrichingCreator}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
                >
                  <RefreshCw className={`h-3 w-3 ${enrichingCreator ? 'animate-spin' : ''}`} />
                  Re-extract Themes
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedCreator.enrichment?.content_themes?.map((th: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                    {th}
                  </span>
                ))}
              </div>

              {selectedCreator.enrichment?.recent_video_titles?.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-[11px] font-semibold text-slate-400 mb-1">Recent Sampled Titles:</h4>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {selectedCreator.enrichment.recent_video_titles.map((vt: string, idx: number) => (
                      <li key={idx} className="truncate text-slate-400 text-[11px]">
                        🎬 {vt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Contact Email & Manual Verification */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Public Contact Email</span>
                <span className="text-[10px] text-slate-400">
                  Status: <strong className="text-indigo-300">{selectedCreator.enrichment?.email_verification_status || 'none'}</strong>
                </span>
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="email"
                  placeholder="Enter verified email from public page..."
                  value={manualEmailInput}
                  onChange={(e) => setManualEmailInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleManualEmailSave}
                  disabled={savingEmail || !manualEmailInput}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                >
                  {savingEmail ? 'Saving...' : 'Save & Verify'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                * Zero guessing rule: Only add emails verified from the creator's official public business links.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-600">
        EDXSO AI Engineer Intern Assignment 1 • Automated Micro-Influencer Outreach System
      </footer>
    </div>
  );
}
export default App;
