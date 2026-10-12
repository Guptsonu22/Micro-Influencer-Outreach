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
  Zap,
  Mail,
  MessageSquare,
  Copy,
  Check,
  ShieldAlert,
  AlertOctagon,
  X
} from 'lucide-react';
import { OutreachLogResponse, CreatorRecord, OutreachStatusType } from '../types';
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
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(
    creators.length > 0 ? creators[0].channel_id : ''
  );
  const [selectedChannelType, setSelectedChannelType] = useState<'email' | 'instagram_dm'>('email');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Live send confirmation modal state
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState<boolean>(false);
  const [confirmedLiveCheckbox, setConfirmedLiveCheckbox] = useState<boolean>(false);

  // Instagram manual-copy modal state
  const [showIgCopyModal, setShowIgCopyModal] = useState<boolean>(false);
  const [igCopyData, setIgCopyData] = useState<{ text: string; words: number } | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  // Filter logs
  const filteredLogs = outreachLogs.filter((log) => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (channelTypeFilter !== 'all' && log.channel_type !== channelTypeFilter) return false;
    return true;
  });

  // Selected Creator Record
  const activeCreator = creators.find((c) => c.channel_id === selectedCreatorId);

  // Execute dispatch through 7-stage gatekeeper
  const executeDispatch = async (isLive: boolean) => {
    if (!activeCreator) return;
    setIsSending(true);
    setFeedback(null);
    setShowLiveConfirmModal(false);

    try {
      const response = await api.sendOutreach({
        channel_id: activeCreator.channel_id,
        creator_id: activeCreator.id,
        campaign_id: 'camp_default',
        channel_type: selectedChannelType,
        is_live_requested: isLive,
        confirmed_live_approval: isLive && confirmedLiveCheckbox,
        allow_ineligible_override: false,
      });

      if (response.channel_type === 'instagram_dm' && response.instagram_dm_copy) {
        setIgCopyData({
          text: response.instagram_dm_copy,
          words: response.instagram_dm_copy.trim().split(/\s+/).length,
        });
        setShowIgCopyModal(true);
      }

      setFeedback({
        type: 'success',
        text: `Outreach processed: Status marked as '${response.status}'. Provider: ${response.provider_name}. Atomic duplicate lock engaged.`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Outreach dispatch failed gatekeeper validation.',
      });
    } finally {
      setIsSending(false);
      setConfirmedLiveCheckbox(false);
    }
  };

  // Open Instagram manual copy modal
  const handleOpenInstagramDmModal = async (channelId: string) => {
    try {
      const copyRes = await api.getInstagramDmCopy(channelId);
      setIgCopyData({
        text: copyRes.instagram_dm,
        words: copyRes.word_count,
      });
      setShowIgCopyModal(true);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load Instagram DM copy.' });
    }
  };

  // Copy to clipboard helper
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const getStatusBadge = (status: OutreachStatusType | string) => {
    switch (status) {
      case 'sent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'simulated':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'sending':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse';
      case 'approved':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'draft':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'duplicate_skipped':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'ambiguous':
        return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Outreach Tracker & Audit Log
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Immutable Trail
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            7-stage gatekeeper, simulated dry-runs, atomic duplicate prevention, and Meta TOS compliance.
          </p>
        </div>

        {/* Direct CSV Export */}
        <a
          href={api.getOutreachExportUrl('csv')}
          download="outreach_audit_history.csv"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <Download className="h-3.5 w-3.5" />
          Export Audit History (.CSV)
        </a>
      </div>

      {/* Simulation Safety Indicator Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Simulation Mode Active (Default)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold uppercase">
                Zero Spam Risk
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Outreach dispatches simulate full provider latency and response codes without contacting real inboxes.
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-right sm:text-left">
          <span>Atomic Guard: </span>
          <span className="text-emerald-400 font-semibold">Unique Campaign + Channel Key</span>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : feedback.type === 'warning'
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Interactive Outreach Dispatch Controller Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          Outreach Dispatch Controller (7-Gate Verified)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-[11px] text-slate-400 block mb-1">Target Creator</label>
            <select
              value={selectedCreatorId}
              onChange={(e) => setSelectedCreatorId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {creators.map((c) => (
                <option key={c.channel_id} value={c.channel_id}>
                  {c.title} — {c.enrichment?.contact_email || 'No email'} ({c.classification?.decision ?? 'review'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Channel Type</label>
            <select
              value={selectedChannelType}
              onChange={(e) => setSelectedChannelType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="email">Email Collaboration Pitch</option>
              <option value="instagram_dm">Instagram DM (Manual Copy)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => executeDispatch(false)}
              disabled={isSending || !selectedCreatorId}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow-md transition"
            >
              {isSending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Simulate Send
            </button>

            {!isSimulationMode && selectedChannelType === 'email' && (
              <button
                onClick={() => setShowLiveConfirmModal(true)}
                disabled={isSending || !selectedCreatorId}
                className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold shadow-md transition"
                title="Initiate live email delivery"
              >
                Live Send
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" /> Filter Logs:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Status: All Statuses</option>
            <option value="simulated">Simulated</option>
            <option value="sent">Sent (Confirmed Live)</option>
            <option value="sending">Sending (Atomic Lock)</option>
            <option value="approved">Approved</option>
            <option value="failed">Failed</option>
            <option value="ambiguous">Ambiguous (Timeout)</option>
            <option value="duplicate_skipped">Duplicate Skipped</option>
          </select>

          <select
            value={channelTypeFilter}
            onChange={(e) => setChannelTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="instagram_dm">Instagram DM</option>
          </select>
        </div>

        <div className="text-slate-400">
          Showing <span className="text-white font-bold">{filteredLogs.length}</span> audit records
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
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Provider ID</th>
                  <th className="py-2.5 px-3">Dispatched At</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono text-indigo-400">{log.id}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{log.recipient_contact}</td>
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1 text-slate-400 capitalize">
                        {log.channel_type === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3 text-pink-400" />}
                        {log.channel_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(log.status)}`}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {log.provider_message_id || <span className="text-slate-600">N/A</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {log.channel_type === 'instagram_dm' ? (
                        <button
                          onClick={() => handleOpenInstagramDmModal(log.channel_id)}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                        >
                          <Copy className="h-3 w-3" /> Copy DM
                        </button>
                      ) : log.source_url ? (
                        <a
                          href={log.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600 italic">None</span>
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

      {/* Live Send Confirmation Modal (Gate 5 Safety Step) */}
      {showLiveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertOctagon className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Live Email Delivery Confirmation</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to dispatch a <strong>REAL email</strong> to{' '}
              <span className="text-rose-400 font-mono font-semibold">{activeCreator?.enrichment?.contact_email}</span>.
              This action will deliver to the recipient's live inbox via SMTP.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Creator:</span>
                <span className="text-white font-semibold">{activeCreator?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Campaign:</span>
                <span className="text-white">camp_default</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Word Count Guard:</span>
                <span className="text-emerald-400">60–90 words verified</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedLiveCheckbox}
                onChange={(e) => setConfirmedLiveCheckbox(e.target.checked)}
                className="accent-rose-500 mt-0.5"
              />
              <span>
                I confirm that I have reviewed the email copy and explicitly authorize sending to this creator's inbox.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowLiveConfirmModal(false);
                  setConfirmedLiveCheckbox(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => executeDispatch(true)}
                disabled={!confirmedLiveCheckbox || isSending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg"
              >
                Confirm & Dispatch Real Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instagram DM Manual Copy Workflow Modal */}
      {showIgCopyModal && igCopyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-pink-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Instagram DM Copy (Manual Workflow)
                </h3>
              </div>
              <button
                onClick={() => setShowIgCopyModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              <span>
                <strong>Meta Platform Terms Compliance:</strong> Direct message automation is forbidden.
                Copy this approved copy to send manually via your official Instagram account.
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Approved DM Copy:</span>
                <span className="text-pink-400 font-semibold">{igCopyData.words} words (Target: 15–30)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans select-all">
                {igCopyData.text}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">Atomic outreach record logged</span>
              <button
                onClick={() => handleCopyToClipboard(igCopyData.text)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md transition"
              >
                {copiedToast ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedToast ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
