import React, { useState, useEffect, useCallback } from 'react';
import { SystemHealth, CreatorRecord, DiscoveryRunResponse, OutreachLogResponse } from './types';
import { api } from './services/api';
import { Navbar, NavTab } from './components/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { InfluencerExplorerPage } from './pages/InfluencerExplorerPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { MessageStudioPage } from './pages/MessageStudioPage';
import { OutreachTrackerPage } from './pages/OutreachTrackerPage';
import { SettingsPage } from './pages/SettingsPage';
import { AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Global datasets
  const [creators, setCreators] = useState<CreatorRecord[]>([]);
  const [loadingCreators, setLoadingCreators] = useState<boolean>(true);
  const [discoveryRuns, setDiscoveryRuns] = useState<DiscoveryRunResponse[]>([]);
  const [outreachLogs, setOutreachLogs] = useState<OutreachLogResponse[]>([]);
  const [totalMessagesCount, setTotalMessagesCount] = useState<number>(0);

  // Context transfer between pages
  const [studioSelectedCreator, setStudioSelectedCreator] = useState<CreatorRecord | null>(null);

  // Load health and system readiness
  const fetchHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
      setGlobalError(null);
    } catch (err: any) {
      setGlobalError(err.message || 'Unable to connect to the backend API.');
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  // Load creators
  const fetchCreators = useCallback(async () => {
    setLoadingCreators(true);
    try {
      const data = await api.getCreators({ page: 1, page_size: 100 });
      setCreators(data.items || []);
    } catch {
      // Backend may be offline or starting up
    } finally {
      setLoadingCreators(false);
    }
  }, []);

  // Load discovery runs history
  const fetchDiscoveryRuns = useCallback(async () => {
    try {
      const runs = await api.listDiscoveryRuns(20);
      setDiscoveryRuns(runs || []);
    } catch {
      // Graceful fallback
    }
  }, []);

  // Load outreach audit logs
  const fetchOutreachLogs = useCallback(async () => {
    try {
      const logs = await api.listOutreachLogs(50);
      setOutreachLogs(logs || []);
    } catch {
      // Graceful fallback
    }
  }, []);

  // Load messages count
  const fetchMessagesCount = useCallback(async () => {
    try {
      const msgs = await api.listMessages({ limit: 100 });
      setTotalMessagesCount(msgs ? msgs.length : 0);
    } catch {
      // Graceful fallback
    }
  }, []);

  // Comprehensive refresh
  const handleRefreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchHealth(),
      fetchCreators(),
      fetchDiscoveryRuns(),
      fetchOutreachLogs(),
      fetchMessagesCount(),
    ]);
  }, [fetchHealth, fetchCreators, fetchDiscoveryRuns, fetchOutreachLogs, fetchMessagesCount]);

  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // Navigate to Message Studio with creator preselected
  const handleSelectCreatorForStudio = (creator: CreatorRecord) => {
    setStudioSelectedCreator(creator);
    setActiveTab('studio');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <Navbar
        health={health}
        loading={loadingHealth || loadingCreators}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefreshAll}
      />

      {/* Global System Notice for Offline or Backend Errors */}
      {globalError && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>
              <strong>Backend Connection Notice:</strong> {globalError} Run <code className="bg-rose-950/60 px-1.5 py-0.5 rounded text-rose-200">python -m uvicorn backend.app.main:app --reload</code> to connect.
            </span>
          </div>
          <button
            onClick={fetchHealth}
            className="text-xs px-2 py-0.5 bg-rose-500/20 rounded hover:bg-rose-500/30 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
        {activeTab === 'overview' && (
          <OverviewPage
            health={health}
            creators={creators}
            discoveryRuns={discoveryRuns}
            outreachLogs={outreachLogs}
            totalMessagesCount={totalMessagesCount}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'explorer' && (
          <InfluencerExplorerPage
            creators={creators}
            loading={loadingCreators}
            onRefresh={handleRefreshAll}
            onSelectCreatorForStudio={handleSelectCreatorForStudio}
          />
        )}

        {activeTab === 'discovery' && (
          <DiscoveryPage
            discoveryRuns={discoveryRuns}
            onDiscoveryStarted={handleRefreshAll}
            onRefresh={fetchDiscoveryRuns}
          />
        )}

        {activeTab === 'studio' && (
          <MessageStudioPage
            creators={creators}
            selectedCreatorInitial={studioSelectedCreator}
            onRefresh={handleRefreshAll}
          />
        )}

        {activeTab === 'outreach' && (
          <OutreachTrackerPage
            outreachLogs={outreachLogs}
            creators={creators}
            isSimulationMode={health?.safety_guardrails.simulation_mode ?? true}
            onRefresh={fetchOutreachLogs}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            health={health}
            onRefresh={handleRefreshAll}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            EDXSO Automated Micro-Influencer Outreach System • Production Prototype
          </div>
          <div className="flex items-center gap-3">
            <span>Simulation Default: Enabled</span>
            <span>•</span>
            <span>Safe Provenance Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
