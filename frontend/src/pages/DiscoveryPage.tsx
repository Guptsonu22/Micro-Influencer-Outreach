import React, { useState } from 'react';
import {
  Play,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database,
  Layers,
  Zap,
  Info,
  Check,
  ShieldAlert
} from 'lucide-react';
import { DiscoveryRunResponse, DiscoverySummary } from '../types';
import { api } from '../services/api';

interface DiscoveryPageProps {
  discoveryRuns: DiscoveryRunResponse[];
  onDiscoveryStarted: () => void;
  onRefresh: () => void;
}

export const DiscoveryPage: React.FC<DiscoveryPageProps> = ({
  discoveryRuns,
  onDiscoveryStarted,
  onRefresh,
}) => {
  // Discovery Configuration State
  const [targetCount, setTargetCount] = useState<number>(50);
  const [maxQuotaBudget, setMaxQuotaBudget] = useState<number>(2500);
  const [useDemoMode, setUseDemoMode] = useState<boolean>(false);
  const [regionCode, setRegionCode] = useState<string>('US');

  // Pre-configured AI & Tech search query topics
  const defaultAvailableQueries = [
    'AI tools tutorials',
    'Machine learning tutorials',
    'Software development',
    'Programming education',
    'Developer productivity',
    'Generative AI tutorials',
    'Python data science',
    'NextJS full stack tutorial'
  ];

  const [selectedQueries, setSelectedQueries] = useState<string[]>([
    'AI tools tutorials',
    'Machine learning tutorials',
    'Software development',
    'Programming education'
  ]);

  // Execution state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeRunSummary, setActiveRunSummary] = useState<DiscoverySummary | null>(null);
  const [lastCompletedRun, setLastCompletedRun] = useState<DiscoveryRunResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if any run in the list is currently running (Duplicate Concurrent Run Guard)
  const isAnyRunCurrentlyActive = isRunning || discoveryRuns.some((r) => r.status === 'running' || r.status === 'pending');

  const toggleQuery = (q: string) => {
    if (selectedQueries.includes(q)) {
      if (selectedQueries.length > 1) {
        setSelectedQueries(selectedQueries.filter((item) => item !== q));
      }
    } else {
      setSelectedQueries([...selectedQueries, q]);
    }
  };

  const handleStartDiscovery = async () => {
    if (isAnyRunCurrentlyActive) {
      setErrorMessage('A discovery run is already active. Duplicate concurrent runs are blocked to protect API quotas.');
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);
    setActiveRunSummary(null);

    try {
      const response = await api.triggerDiscovery({
        queries: selectedQueries,
        target_count: targetCount,
        max_quota_budget: maxQuotaBudget,
        region_code: regionCode,
        use_demo_mode: useDemoMode,
      });

      setLastCompletedRun(response);
      setActiveRunSummary(response.summary);
      onDiscoveryStarted();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Discovery run failed to execute.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          YouTube Influencer Discovery
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
            YouTube Data API v3
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Automated search query harvesting, 50-channel batch hydration, deduplication, and engagement sampling.
        </p>
      </div>

      {/* Concurrent Run Guard Warning if running */}
      {isAnyRunCurrentlyActive && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
            <span className="font-semibold">Discovery Run In Progress...</span>
            <span className="text-slate-400 hidden sm:inline">— New runs disabled to prevent quota exhaustion.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 font-mono">
            LOCK_ACTIVE
          </span>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-semibold">Execution Warning</div>
            <div className="text-slate-300 text-[11px] mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Form / Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Controls (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-400" />
            Discovery Run Parameters
          </h2>

          {/* Search Queries */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Niche Queries (Tech & AI Vertical)</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {selectedQueries.length} selected
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {defaultAvailableQueries.map((q) => {
                const isSelected = selectedQueries.includes(q);
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => toggleQuery(q)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 inline mr-1" />}
                    {q}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider: Target Records & Quota Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Target Micro-Influencers</span>
                <span className="font-bold text-indigo-400">{targetCount} creators</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>10</span>
                <span>50 (Assignment Target)</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">Max Quota Budget</span>
                <span className="font-bold text-indigo-400">{maxQuotaBudget} units</span>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="250"
                value={maxQuotaBudget}
                onChange={(e) => setMaxQuotaBudget(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>500</span>
                <span>2,500 units</span>
                <span>5,000 units</span>
              </div>
            </div>
          </div>

          {/* Region and Demo Mode Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Geographic Region</label>
              <select
                value={regionCode}
                onChange={(e) => setRegionCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="US">United States (US)</option>
                <option value="IN">India (IN)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="CA">Canada (CA)</option>
                <option value="GLOBAL">Global / All Regions</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Execution Mode</label>
              <div
                onClick={() => setUseDemoMode(!useDemoMode)}
                className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition ${
                  useDemoMode
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">Quota-Free Demo Mode</div>
                    <div className="text-[10px] text-slate-400">Generates labeled synthetic records</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useDemoMode}
                  onChange={() => {}}
                  className="accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Trigger Button with duplicate concurrency lock */}
          <div className="pt-2">
            <button
              onClick={handleStartDiscovery}
              disabled={isAnyRunCurrentlyActive || selectedQueries.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executing Multi-Query Search & Hydration...
                </>
              ) : isAnyRunCurrentlyActive ? (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Active Run In Progress (Duplicate Lock)
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  Launch Discovery Run ({targetCount} Creators Target)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Execution Summary or Live Stats */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Latest Run Attrition Report
            </h2>

            {activeRunSummary || (lastCompletedRun && lastCompletedRun.summary) ? (
              (() => {
                const sum = activeRunSummary || lastCompletedRun!.summary;
                return (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Search Hits:</span>
                        <span className="font-bold text-white">{sum.total_search_results}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Unique Channels:</span>
                        <span className="font-bold text-white">{sum.unique_channels_found}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Qualifying Micro-Influencers:</span>
                        <span className="font-bold text-emerald-400 text-sm">{sum.qualifying_channels}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Quota Units Expended:</span>
                        <span className="font-bold text-slate-300">{sum.quota_units_used} units</span>
                      </div>
                    </div>

                    {/* Attrition breakdown */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-400 mb-2">Rejection Analysis</h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-800">
                          <span className="text-slate-400">Below 5,000 Subs:</span>
                          <span className="text-slate-200 font-semibold">{sum.rejection_breakdown.too_few_subscribers ?? 0}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-800">
                          <span className="text-slate-400">Above 100,000 Subs:</span>
                          <span className="text-slate-200 font-semibold">{sum.rejection_breakdown.too_many_subscribers ?? 0}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-800">
                          <span className="text-slate-400">Hidden Subscriber Count:</span>
                          <span className="text-slate-200 font-semibold">{sum.rejection_breakdown.hidden_subscribers ?? 0}</span>
                        </div>
                        <div className="flex justify-between p-2 rounded bg-slate-950/40 border border-slate-800">
                          <span className="text-slate-400">Insufficient Public Activity:</span>
                          <span className="text-slate-200 font-semibold">{sum.rejection_breakdown.insufficient_activity ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* API Errors */}
                    {sum.api_errors && sum.api_errors.length > 0 && (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                        <span className="font-semibold">Encountered API Warnings:</span>
                        <ul className="list-disc list-inside mt-1 text-[11px] text-slate-400">
                          {sum.api_errors.map((e, idx) => (
                            <li key={idx}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 bg-slate-950/30 rounded-xl border border-dashed border-slate-800">
                <Info className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No active discovery run results yet.</p>
                <p className="text-[11px] text-slate-500 mt-1">Configure your search and click launch.</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
            <div>• Free Daily Quota: 10,000 units</div>
            <div>• Search List: 100 units / page</div>
            <div>• Channel Hydration: 1 unit / 50 channels</div>
          </div>
        </div>
      </div>

      {/* Historical Discovery Runs Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Discovery Execution History ({discoveryRuns.length} Runs)
            </h2>
          </div>
          <button
            onClick={onRefresh}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" /> Refresh History
          </button>
        </div>

        {discoveryRuns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Qualifying</th>
                  <th className="py-2.5 px-3">Quota Used</th>
                  <th className="py-2.5 px-3">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {discoveryRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-indigo-400">{run.id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        run.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : run.status === 'running'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {run.is_demo_run ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                          DEMO
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                          YOUTUBE LIVE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{run.target_count}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">
                      {run.summary?.qualifying_channels ?? 0}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {run.summary?.quota_units_used ?? 0} units
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            No historical runs recorded.
          </div>
        )}
      </div>
    </div>
  );
};
