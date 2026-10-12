import React from 'react';
import { Sparkles, RefreshCw, Activity, Search, Sliders, Mail } from 'lucide-react';
import { SystemHealth } from '../types';

interface NavbarProps {
  health: SystemHealth | null;
  loading: boolean;
  activeTab: 'overview' | 'discovery' | 'pipeline' | 'outreach';
  onTabChange: (tab: 'overview' | 'discovery' | 'pipeline' | 'outreach') => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  loading,
  activeTab,
  onTabChange,
  onRefresh,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">EDXSO</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                AI Outreach Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Automated Micro-Influencer Discovery & Pipeline</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onTabChange('overview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Overview
          </button>
          <button
            onClick={() => onTabChange('discovery')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'discovery'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Discovery
          </button>
          <button
            onClick={() => onTabChange('pipeline')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'pipeline'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Pipeline & Fit
          </button>
          <button
            onClick={() => onTabChange('outreach')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'outreach'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Outreach Review
          </button>
        </nav>

        {/* Refresh Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
};
