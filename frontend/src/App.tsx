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
  AlertTriangle,
  Send,
  MessageSquare,
  Bot
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

  // Outreach Review State
  const [activeCreatorIndex, setActiveCreatorIndex] = useState<number>(0);
  const [editingEmailSubject, setEditingEmailSubject] = useState<string>('');
  const [editingEmailBody, setEditingEmailBody] = useState<string>('');
  const [editingInstagramDm, setEditingInstagramDm] = useState<string>('');
  const [generatingCopy, setGeneratingCopy] = useState<boolean>(false);
  const [currentMessageRecord, setCurrentMessageRecord] = useState<any | null>(null);
  const [messagesList, setMessagesList] = useState<any[]>([]);

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

  const fetchMessages = async () => {
    try {
      const data = await api.listMessages({ limit: 100 });
      setMessagesList(data || []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchCreators();
    fetchMessages();
  }, []);

  const activeInfluencer = creators[activeCreatorIndex] || null;

  // Sync draft inputs when active creator changes
  useEffect(() => {
    if (activeInfluencer) {
      const outreach = activeInfluencer.outreach || {};
      setEditingEmailSubject(outreach.email_subject || 'EDXSO Developer Workshop Collaboration');
      setEditingEmailBody(outreach.email_body || '');
      setEditingInstagramDm(outreach.instagram_dm || '');
    }
  }, [activeCreatorIndex, creators]);

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

  const handleGenerateCopy = async () => {
    if (!activeInfluencer) return;
    setGeneratingCopy(true);
    setError(null);
    try {
      const res = await api.generateMessage({
        channel_id: activeInfluencer.channel_id,
        allow_ineligible_override: true,
        force_mock: !health?.integrations.gemini_api_configured,
      });
      setCurrentMessageRecord(res);
      setEditingEmailSubject(res.email_subject);
      setEditingEmailBody(res.email_body);
      setEditingInstagramDm(res.instagram_dm);
      await fetchCreators(decisionFilter);
      await fetchMessages();
    } catch (err: any) {
      setError(err.message || 'Failed to generate copy.');
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!activeInfluencer) return;
    try {
      if (currentMessageRecord?.id) {
        await api.editMessage(currentMessageRecord.id, {
          email_subject: editingEmailSubject,
          email_body: editingEmailBody,
          instagram_dm: editingInstagramDm,
          status: 'approved'
        });
      }
      await fetchCreators(decisionFilter);
      await fetchMessages();
      alert('Message draft marked as APPROVED.');
    } catch (err: any) {
      alert(err.message || 'Failed to approve draft');
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

  const countWords = (text: string) => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const emailWords = countWords(editingEmailBody);
  const dmWords = countWords(editingInstagramDm);

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
          fetchMessages();
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
                      Phase 5 Active
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Architecture Foundation</h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AI Personalization Engine with Gemini integration, word-count verification (60–90 words email, 15–30 words DM), and copy review.
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
                    <span className="text-slate-400">Generated Drafts:</span>
                    <span className="font-medium text-emerald-400">{messagesList.length} Messages</span>
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
                    <span>Word counts enforced: 60-90w (Email), 15-30w (DM)</span>
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
                    <span>Phase 1-4: Discovery, Filtering & Enrichment</span>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                    <span>Phase 5: AI Personalization Engine</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">Current</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400">
                    <span>Phase 6: Simulation Queue & Live Approval</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-slate-400">Next</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Hero */}
            <div className="glass-panel p-6 rounded-2xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Generate Personalized Creator Pitches</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Draft source-backed collaboration emails and Instagram DMs with verified word counts and approval review.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('outreach')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shrink-0 shadow-lg shadow-indigo-600/30"
              >
                Go to Outreach Review
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
          </div>
        )}

        {/* TAB 3: PIPELINE & BRAND-FIT CLASSIFICATION */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
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
          </div>
        )}

        {/* TAB 4: OUTREACH REVIEW & AI PERSONALIZATION ENGINE */}
        {activeTab === 'outreach' && (
          <div className="space-y-6">
            {/* Header & Stats Banner */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  AI Personalization & Outreach Review Queue
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Provider: <strong className="text-slate-200">{health?.integrations.gemini_api_configured ? 'Google Gemini 1.5 Flash' : 'Mock Provider (Test/Demo)'}</strong> • Strict word counts: Email (60–90w), Instagram DM (15–30w).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateCopy}
                  disabled={generatingCopy || !activeInfluencer}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
                >
                  <Bot className={`h-4 w-4 ${generatingCopy ? 'animate-spin' : ''}`} />
                  {generatingCopy ? 'Generating Copy...' : 'Generate / Regenerate Copy'}
                </button>
                <button
                  onClick={handleApproveDraft}
                  disabled={!editingEmailBody}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition shadow-lg shadow-emerald-600/20"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Draft
                </button>
              </div>
            </div>

            {/* Creator Selection Ribbon */}
            <div className="glass-panel p-4 rounded-xl flex items-center gap-3 overflow-x-auto">
              <span className="text-[11px] font-semibold uppercase text-slate-400 shrink-0">Select Creator:</span>
              <div className="flex gap-2">
                {creators.slice(0, 15).map((cr, idx) => {
                  const isSelected = activeCreatorIndex === idx;
                  const hasCopy = Boolean(cr.outreach?.email_body);
                  return (
                    <button
                      key={cr.channel_id}
                      onClick={() => setActiveCreatorIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{cr.title}</span>
                      {hasCopy && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Two-Pane Review Cards: Email & Instagram DM */}
            {activeInfluencer ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Collaboration Email Card */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">Email Collaboration Pitch</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        emailWords >= 60 && emailWords <= 90
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {emailWords} words (Target: 60–90)
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Subject Line:</label>
                        <input
                          type="text"
                          value={editingEmailSubject}
                          onChange={(e) => setEditingEmailSubject(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Email Body:</label>
                        <textarea
                          rows={7}
                          value={editingEmailBody}
                          onChange={(e) => setEditingEmailBody(e.target.value)}
                          placeholder="Click 'Generate Copy' to create a personalized pitch..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
                    <span>Recipient: <strong className="text-slate-300">{activeInfluencer.enrichment?.contact_email}</strong></span>
                    <span>Status: <strong className="text-indigo-300 uppercase">{activeInfluencer.outreach?.status || 'draft'}</strong></span>
                  </div>
                </div>

                {/* 2. Instagram DM Card & Evidence */}
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-purple-400" />
                          <h3 className="text-sm font-bold text-white">Instagram DM Draft</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          dmWords >= 15 && dmWords <= 30
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          {dmWords} words (Target: 15–30)
                        </span>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">Direct Message Copy:</label>
                        <textarea
                          rows={3}
                          value={editingInstagramDm}
                          onChange={(e) => setEditingInstagramDm(e.target.value)}
                          placeholder="Concise DM copy for social collaboration..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-3">
                      * Instagram DMs are copy drafts only for human review (strict compliance with anti-bot policies).
                    </p>
                  </div>

                  {/* Personalization Evidence Inspector */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800">
                    <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                      Source-Backed Personalization Evidence
                    </h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Creator: <strong className="text-slate-300">{activeInfluencer.title}</strong></li>
                      <li>• Niche: <strong className="text-slate-300">{activeInfluencer.classification?.niche}</strong></li>
                      <li>• Verified Themes: <span className="text-indigo-300">{activeInfluencer.enrichment?.content_themes?.join(', ')}</span></li>
                      <li>• Sampled Video Upload: <span className="text-slate-300 italic">{activeInfluencer.enrichment?.recent_video_titles?.[0] || 'None available'}</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-12 text-center text-slate-400 text-xs">
                No creators available in queue. Run discovery to load profiles!
              </div>
            )}
          </div>
        )}
      </main>

      {/* INSPECTOR & ENRICHMENT MODAL */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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
