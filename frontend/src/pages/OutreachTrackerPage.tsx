import React, { useState } from 'react';
import {
  Send,
  Download,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Zap,
  Mail,
  MessageSquare
} from 'lucide-react';
import { OutreachLogResponse, CreatorRecord } from '../types';
import { api } from '../services/api';

interface OutreachTrackerPageProps {
  outreachLogs: OutreachLogResponse[];
  creators: CreatorRecord[];
  isSimulationMode: boolean;
  onRefresh: () => void;
}

export const OutreachTrackerPage: React.FC<OutreachTrackerPageProps> = ({
  outreachLogs,
  creators,
  isSimulationMode,
  onRefresh,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelTypeFilter, setChannelTypeFilter] = useState<string>('all');
  const [isSimulatingSend, setIsSimulatingSend] = useState<boolean>(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(
    creators.length > 0 ? creators[0].channel_id : ''
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter logs
  const filteredLogs = outreachLogs.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (channelTypeFilter !== 'all' && log.channel_type !== channelTypeFilter) return false;
    return true;
  });

  // Trigger an outreach simulation directly
  const handleRecordSimulatedOutreach = async () => {
    if (!selectedCreatorId) return;
    const targetCreator = creators.find((c) => c.channel_id === selectedCreatorId);
    if (!targetCreator) return;

    setIsSimulatingSend(true);
    setFeedback(null);

    const email = targetCreator.enrichment?.contact_email &&
      targetCreator.enrichment.contact_email.toLowerCase() !== 'not found'
      ? targetCreator.enrichment.contact_email
      : `${targetCreator.channel_id}@creator.mock`;

    try {
      await api.recordOutreach({
        creator_id: targetCreator.id || targetCreator.channel_id,
        channel_id: targetCreator.channel_id,
        channel_type: 'email',
        recipient_contact: email,
        is_simulation: isSimulationMode,
        source_url: targetCreator.channel_url,
      });

      setFeedback({
        type: 'success',
        text: `Outreach ${isSimulationMode ? 'simulated & logged' : 'dispatched'} successfully! Duplicate lock engaged for this channel.`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Outreach recording failed.',
      });
    } finally {
      setIsSimulatingSend(false);
    }
  };

  // Export logs to CSV
  const handleExportLogsCsv = () => {
    if (outreachLogs.length === 0) return;
    const headers = ['Log ID', 'Channel ID', 'Recipient', 'Channel Type', 'Mode', 'Status', 'Timestamp', 'Errors'];
    const rows = outreachLogs.map((l) => [
      l.id,
      l.channel_id,
      l.recipient_contact,
      l.channel_type,
      l.is_simulation ? 'Simulated' : 'Live',
      l.status,
      l.timestamp,
      l.error_details || 'None',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'outreach_audit_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Outreach Tracker & Audit Log
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Immutable Log
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete audit trail of simulated dry-runs and live email dispatches with strict duplicate prevention.
          </p>
        </div>

        <button
          onClick={handleExportLogsCsv}
          disabled={outreachLogs.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium border border-slate-700 transition"
        >
          <Download className="h-3.5 w-3.5" />
          Export Audit Logs (.CSV)
        </button>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Simulation Mode Active</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold uppercase">
                Zero Spam Risk
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Outreach dispatches are safely simulated and permanently audited without hitting external mail servers.
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-right sm:text-left">
          <span>Duplicate Rule: </span>
          <span className="text-emerald-400 font-semibold">1 outreach max per creator channel</span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Interactive Simulation Trigger Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Test Outreach Action Dispatcher
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <select
              value={selectedCreatorId}
              onChange={(e) => setSelectedCreatorId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {creators.map((c) => (
                <option key={c.channel_id} value={c.channel_id}>
                  {c.title} — {c.enrichment?.contact_email || 'No email'} ({c.classification?.decision})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRecordSimulatedOutreach}
            disabled={isSimulatingSend || !selectedCreatorId}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md transition"
          >
            {isSimulatingSend ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Dispatching & Auditing...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Simulate Outreach Dispatch
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filter by:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Status: All</option>
            <option value="simulated">Simulated</option>
            <option value="sent">Live Sent</option>
            <option value="failed">Failed / Duplicates</option>
          </select>

          <select
            value={channelTypeFilter}
            onChange={(e) => setChannelTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Channel: All Types</option>
            <option value="email">Email</option>
            <option value="instagram_dm">Instagram DM</option>
          </select>
        </div>

        <div className="text-slate-400">
          Showing <span className="text-white font-bold">{filteredLogs.length}</span> audit logs
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Log ID</th>
                  <th className="py-2.5 px-3">Recipient Contact</th>
                  <th className="py-2.5 px-3">Channel Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Provenance Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-indigo-400">{log.id}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{log.recipient_contact}</td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1 text-slate-400">
                        {log.channel_type === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                        {log.channel_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'simulated'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : log.status === 'sent'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.is_simulation ? (
                        <span className="text-[10px] text-amber-300 font-semibold">Simulated</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-semibold">Live</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.source_url ? (
                        <a
                          href={log.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            No outreach attempts found matching the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};
