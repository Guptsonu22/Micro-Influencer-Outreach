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
  FileCode
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

  const fetchCreators = async () => {
    setLoadingCreators(true);
    try {
      const data = await api.getCreators({ page: 1, page_size: 50 });
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
        min_subscribers: 5000,
        max_subscribers: 100000,
        region_code: 'US',
        use_demo_mode: useDemoMode,
      });
      setDiscoverySummary(res.summary);
      await fetchCreators();
      await fetchHealth();
    } catch (err: any) {
      setError(err.message || 'Discovery run failed.');
    } finally {
      setRunningDiscovery(false);
    }
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
          fetchCreators();
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
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* System Status Card */}
              <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Core Engine</span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Phase 3 Active
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Architecture Foundation</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    FastAPI backend with Motor data-access layer, YouTube Data API v3 discovery engine, and Vite/React dashboard.
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
                    <span>Phase 1: Architecture & Schemas</span>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                    <span>Phase 2: FastAPI & Motor Backend</span>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                    <span>Phase 3: Real YouTube Discovery</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">Current</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Hero */}
            <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Ready to Discover Micro-Influencers?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Run YouTube discovery to find creators in Technology and AI with 5,000–100,000 subscribers.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('discovery')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shrink-0 shadow-lg shadow-indigo-600/30"
              >
                Go to Discovery Engine
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* TAB 2: DISCOVERY */}
        {activeTab === 'discovery' && (
          <div className="space-y-6">
            {/* Discovery Control Panel */}
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
                {/* Search Queries Multi-select */}
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

                {/* Target Count & Quota Budget */}
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

                  {/* Demo Mode Toggle */}
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

            {/* Discovered Creators Table */}
            <div className="glass-panel p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Discovered Influencer Profiles ({creators.length})</h3>
                <span className="text-xs text-slate-400">5k–100k Subscribers Micro-Tier</span>
              </div>

              {loadingCreators ? (
                <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  Loading creators dataset...
                </div>
              ) : creators.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No creators discovered yet. Run the discovery pipeline above to discover creators!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                        <th className="pb-3">Creator / Channel</th>
                        <th className="pb-3">Subscribers</th>
                        <th className="pb-3">Est. Engagement</th>
                        <th className="pb-3">Contact Email</th>
                        <th className="pb-3">Qualification</th>
                        <th className="pb-3">Provenance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {creators.map((c: any) => (
                        <tr key={c.channel_id} className="hover:bg-slate-900/40 transition">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
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
                                <a
                                  href={c.channel_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-slate-200 hover:text-indigo-400 transition flex items-center gap-1"
                                >
                                  {c.title}
                                  <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                                </a>
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
                            {c.metrics?.estimated_engagement_rate ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                {c.metrics.estimated_engagement_rate}%
                              </span>
                            ) : (
                              <span className="text-slate-500">N/A</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {c.enrichment?.contact_email === 'Not Found' ? (
                              <span className="text-slate-500 italic">Not Found</span>
                            ) : (
                              <span className="text-indigo-300 font-mono text-[11px]">{c.enrichment?.contact_email}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {c.classification?.is_qualified ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                Qualified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            {c.is_synthetic ? (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono text-[10px]">
                                Demo Record
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono text-[10px]">
                                Real API
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3 & 4 Placeholders */}
        {activeTab === 'pipeline' && (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <Sliders className="h-8 w-8 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">Filtering & Brand-Fit Classification Engine</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Configurable scoring rules, keyword relevance analysis, and qualification reasoning. (Scheduled for Phase 4).
            </p>
          </div>
        )}

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

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-600">
        EDXSO AI Engineer Intern Assignment 1 • Automated Micro-Influencer Outreach System
      </footer>
    </div>
  );
}
export default App;
