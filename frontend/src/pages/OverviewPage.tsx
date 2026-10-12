import React from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MailQuestion,
  Bot,
  Send,
  Database,
  ArrowRight,
  AlertTriangle,
  Clock,
  Sparkles,
  Search
} from 'lucide-react';
import { SystemHealth, DiscoveryRunResponse, OutreachLogResponse } from '../types';
import { NavTab } from '../components/Navbar';

interface OverviewPageProps {
  health: SystemHealth | null;
  creators: any[];
  discoveryRuns: DiscoveryRunResponse[];
  outreachLogs: OutreachLogResponse[];
  totalMessagesCount: number;
  onNavigate: (tab: NavTab) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  health,
  creators,
  discoveryRuns,
  outreachLogs,
  totalMessagesCount,
  onNavigate,
}) => {
  // Real statistics derived directly from backend responses
  const realCount = health?.database.real_records ?? creators.filter(c => !c.is_synthetic).length;
  const syntheticCount = health?.database.synthetic_records ?? creators.filter(c => c.is_synthetic).length;
  const totalCount = health?.database.total_records ?? creators.length;

  // Qualification Breakdown
  const qualifiedCount = creators.filter(c => c.classification?.decision === 'pass' || c.classification?.is_qualified).length;
  const rejectedCount = creators.filter(c => c.classification?.decision === 'fail').length;
  const reviewCount = creators.filter(c => c.classification?.decision === 'needs_review').length;

  // Missing email count
  const missingEmailCount = creators.filter(c => {
    const email = c.enrichment?.contact_email;
    return !email || email.trim() === '' || email.toLowerCase() === 'not found';
  }).length;
  const hasEmailCount = totalCount - missingEmailCount;

  // Outreach statuses
  const simulatedOutreachCount = outreachLogs.filter(l => l.is_simulation || l.status === 'simulated').length;
  const sentOutreachCount = outreachLogs.filter(l => !l.is_simulation && l.status === 'sent').length;
  const failedOutreachCount = outreachLogs.filter(l => l.status === 'failed').length;

  // Latest Discovery Run
  const latestRun = discoveryRuns && discoveryRuns.length > 0 ? discoveryRuns[0] : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-6 md:p-8 backdrop-blur shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              Automated Micro-Influencer Outreach System
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              AI Talent Discovery & Outreach Command Center
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Real-time ingestion of YouTube AI & Tech creators, rule-based qualification (5k-100k subs), strict data provenance, and Gemini 2.5 Flash personalized multi-channel outreach.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('discovery')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
            >
              <Search className="h-4 w-4" />
              Start Discovery Run
            </button>
            <button
              onClick={() => onNavigate('studio')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Bot className="h-4 w-4 text-purple-400" />
              Message Studio
            </button>
          </div>
        </div>
      </div>

      {/* Safety & System Indicator Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Data Provenance Mode</div>
              <div className="text-sm font-bold text-white">
                {realCount} Real / {syntheticCount} Demo
              </div>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {health?.database.status === 'connected' ? 'Persistent' : 'In-Memory'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Outreach Safety Gate</div>
              <div className="text-sm font-bold text-amber-300">
                {health?.safety_guardrails.simulation_mode ? 'Simulation Mode Active' : 'Live Delivery Enabled'}
              </div>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
            SAFE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">AI Personalization Engine</div>
              <div className="text-sm font-bold text-white">
                {health?.integrations.gemini_api_configured ? health.integrations.gemini_model : 'Mock Provider (Fallback)'}
              </div>
            </div>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
            {health?.integrations.gemini_api_configured ? 'API Online' : 'Offline Ready'}
          </span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Records */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Total Creators</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalCount}</div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <span className="text-indigo-400 font-semibold">{realCount} real</span> verified
          </div>
        </div>

        {/* Qualified (Pass) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Qualified (Pass)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{qualifiedCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {totalCount > 0 ? `${Math.round((qualifiedCount / totalCount) * 100)}% pass rate` : '0%'}
          </div>
        </div>

        {/* Needs Review */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Needs Review</span>
            <HelpCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{reviewCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">Borderline / missing metric</div>
        </div>

        {/* Rejected (Fail) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/30 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Rejected (Fail)</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400">{rejectedCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">Out of range / off-topic</div>
        </div>

        {/* Missing Emails */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Missing Emails</span>
            <MailQuestion className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300">{missingEmailCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            {hasEmailCount} emails found
          </div>
        </div>

        {/* Messages Generated */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/30 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">AI Messages</span>
            <Bot className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-indigo-300">{totalMessagesCount}</div>
          <div className="mt-1 text-[11px] text-slate-500">Email & IG DM drafts</div>
        </div>
      </div>

      {/* Main Grid: Discovery Progress & Outreach Status Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Latest Discovery Run Progress & Health */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Discovery Run Status</h2>
              </div>
              <button
                onClick={() => onNavigate('discovery')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                View all runs <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {latestRun ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Run ID: <code className="text-indigo-400">{latestRun.id}</code></span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      latestRun.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : latestRun.status === 'running'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {latestRun.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-center">
                    <div>
                      <div className="text-xs text-slate-500">Target</div>
                      <div className="text-sm font-bold text-white">{latestRun.target_count}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Qualifying</div>
                      <div className="text-sm font-bold text-emerald-400">{latestRun.summary?.qualifying_channels ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Quota Used</div>
                      <div className="text-sm font-bold text-slate-300">{latestRun.summary?.quota_units_used ?? 0} units</div>
                    </div>
                  </div>
                </div>

                {/* Rejection Breakdown */}
                {latestRun.summary?.rejection_breakdown && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 mb-2">Pipeline Filter Attrition</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 flex justify-between">
                        <span className="text-slate-400">&lt;5k Subscribers:</span>
                        <span className="font-semibold text-slate-200">{latestRun.summary.rejection_breakdown.too_few_subscribers ?? 0}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 flex justify-between">
                        <span className="text-slate-400">&gt;100k Subscribers:</span>
                        <span className="font-semibold text-slate-200">{latestRun.summary.rejection_breakdown.too_many_subscribers ?? 0}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 flex justify-between">
                        <span className="text-slate-400">Hidden Subs:</span>
                        <span className="font-semibold text-slate-200">{latestRun.summary.rejection_breakdown.hidden_subscribers ?? 0}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 flex justify-between">
                        <span className="text-slate-400">Low Activity:</span>
                        <span className="font-semibold text-slate-200">{latestRun.summary.rejection_breakdown.insufficient_activity ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Errors */}
                {latestRun.summary?.api_errors && latestRun.summary.api_errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <span className="font-semibold">Discovery API Warnings:</span>
                      <ul className="list-disc list-inside mt-1 text-slate-300 text-[11px]">
                        {latestRun.summary.api_errors.slice(0, 2).map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <Search className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No discovery runs performed yet.</p>
                <p className="text-xs text-slate-500 mt-1">Start a run to collect 50+ real micro-influencers.</p>
                <button
                  onClick={() => onNavigate('discovery')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500"
                >
                  Configure Run
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Quota Safety: Max 2,500 units/run</span>
            <span>Batch Hydration: 50 channels/unit</span>
          </div>
        </div>

        {/* Card 2: Outreach Execution & Simulation Summary */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Outreach Pipeline Summary</h2>
              </div>
              <button
                onClick={() => onNavigate('outreach')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                View full logs <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-xs text-slate-400">Simulated</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{simulatedOutreachCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Dry-run log</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-xs text-slate-400">Live Delivered</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{sentOutreachCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">SMTP/API</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <div className="text-xs text-slate-400">Failed / Blocked</div>
                <div className="text-xl font-bold text-rose-400 mt-1">{failedOutreachCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Duplicates/Errors</div>
              </div>
            </div>

            {/* Recent Outreach Events */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400">Recent Audit Logs</h3>
              {outreachLogs.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {outreachLogs.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          log.status === 'simulated' ? 'bg-amber-400' :
                          log.status === 'sent' ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                        <span className="font-medium text-slate-200 truncate max-w-[140px] sm:max-w-[180px]">
                          {log.recipient_contact}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                          {log.channel_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-950/30 rounded-xl border border-slate-800/80 text-slate-500 text-xs">
                  No outreach recorded yet. Generate messages in the Studio and trigger simulations.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Duplicate Prevention:</span>
            <span className="text-emerald-400 font-medium">Active (1 outreach per channel)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
