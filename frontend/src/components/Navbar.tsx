import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  LayoutDashboard,
  Users,
  Search,
  Bot,
  Send,
  Settings,
  Menu,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { SystemHealth } from '../types';

export type NavTab = 'overview' | 'explorer' | 'discovery' | 'studio' | 'outreach' | 'settings';

interface NavbarProps {
  health: SystemHealth | null;
  loading: boolean;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  loading,
  activeTab,
  onTabChange,
  onRefresh,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'explorer', label: 'Influencer Explorer', icon: Users },
    { id: 'discovery', label: 'Discovery', icon: Search },
    { id: 'studio', label: 'AI Message Studio', icon: Bot },
    { id: 'outreach', label: 'Outreach Tracker', icon: Send },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-30 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">EDXSO</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                AI Outreach
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Automated Micro-Influencer Discovery & Engagement</p>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Section: System Indicator & Refresh */}
        <div className="flex items-center gap-3">
          {health && (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              {health.database.status === 'connected' ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="text-slate-300 font-medium">
                {health.database.status === 'connected' ? 'MongoDB Live' : 'In-Memory Mode'}
              </span>
              {health.safety_guardrails.simulation_mode && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 text-[10px] font-semibold border border-amber-500/20">
                  SIMULATION
                </span>
              )}
            </div>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh dashboard data"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 border-t border-slate-800 bg-slate-900/95 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
