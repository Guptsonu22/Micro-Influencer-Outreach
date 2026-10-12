import React, { useState, useEffect } from 'react';
import {
  Bot,
  Mail,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit3,
  Check,
  AlertTriangle,
  Info,
  Clock,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Layers,
  ExternalLink
} from 'lucide-react';
import { CreatorRecord, GeneratedMessageResponse } from '../types';
import { api } from '../services/api';

interface MessageStudioPageProps {
  creators: CreatorRecord[];
  selectedCreatorInitial?: CreatorRecord | null;
  onRefresh: () => void;
}

export const MessageStudioPage: React.FC<MessageStudioPageProps> = ({
  creators,
  selectedCreatorInitial,
  onRefresh,
}) => {
  // Selected Creator
  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    selectedCreatorInitial?.channel_id || (creators.length > 0 ? creators[0].channel_id : '')
  );

  // Active creator record
  const currentCreator = creators.find((c) => c.channel_id === selectedChannelId) || (creators.length > 0 ? creators[0] : null);

  // Message draft state
  const [currentMessage, setCurrentMessage] = useState<GeneratedMessageResponse | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Editable fields
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [instagramDm, setInstagramDm] = useState<string>('');

  // Generation options
  const [allowOverride, setAllowOverride] = useState<boolean>(false);
  const [forceMock, setForceMock] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Count words helper
  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const emailWordCount = countWords(emailBody);
  const dmWordCount = countWords(instagramDm);

  // Fetch or populate current message for creator
  useEffect(() => {
    if (!selectedChannelId) return;

    const fetchDraft = async () => {
      setLoadingMessage(true);
      setNotification(null);
      setIsEditing(false);
      try {
        const msgs = await api.listMessages({ channel_id: selectedChannelId, limit: 1 });
        if (msgs && msgs.length > 0) {
          const draft = msgs[0];
          setCurrentMessage(draft);
          setEmailSubject(draft.email_subject);
          setEmailBody(draft.email_body);
          setInstagramDm(draft.instagram_dm);
        } else if (currentCreator?.outreach && currentCreator.outreach.email_body) {
          // Fallback to embedded outreach draft
          setEmailSubject(currentCreator.outreach.email_subject || `Collaboration with EDXSO x ${currentCreator.title}`);
          setEmailBody(currentCreator.outreach.email_body || '');
          setInstagramDm(currentCreator.outreach.instagram_dm || '');
          setCurrentMessage(null);
        } else {
          setCurrentMessage(null);
          setEmailSubject(`Partnership Opportunity with EDXSO x ${currentCreator?.title || 'Creator'}`);
          setEmailBody('');
          setInstagramDm('');
        }
      } catch (err: any) {
        setNotification({ type: 'error', text: err.message || 'Failed to fetch existing drafts.' });
      } finally {
        setLoadingMessage(false);
      }
    };

    fetchDraft();
  }, [selectedChannelId]);

  // Generate new copy via Gemini / Mock LLM
  const handleGenerateCopy = async () => {
    if (!currentCreator) return;
    setGenerating(true);
    setNotification(null);
    try {
      const result = await api.generateMessage({
        channel_id: currentCreator.channel_id,
        creator_id: currentCreator.id,
        allow_ineligible_override: allowOverride,
        force_mock: forceMock,
      });

      setCurrentMessage(result);
      setEmailSubject(result.email_subject);
      setEmailBody(result.email_body);
      setInstagramDm(result.instagram_dm);
      setNotification({ type: 'success', text: 'Personalized copy generated successfully with source verification!' });
      onRefresh();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Generation failed.' });
    } finally {
      setGenerating(false);
    }
  };

  // Save edits
  const handleSaveEdits = async () => {
    if (!currentMessage) return;
    setNotification(null);
    try {
      const updated = await api.editMessage(currentMessage.id, {
        email_subject: emailSubject,
        email_body: emailBody,
        instagram_dm: instagramDm,
      });
      setCurrentMessage(updated);
      setIsEditing(false);
      setNotification({ type: 'success', text: 'Draft updates saved successfully!' });
      onRefresh();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to save changes.' });
    }
  };

  // Approve / Reject status update
  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!currentMessage) return;
    setNotification(null);
    try {
      const updated = await api.updateMessageStatus(currentMessage.id, status);
      setCurrentMessage(updated);
      setNotification({ type: 'success', text: `Draft marked as ${status}!` });
      onRefresh();
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to update approval status.' });
    }
  };

  const isQualified = currentCreator?.classification?.decision === 'pass' || currentCreator?.classification?.is_qualified;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          AI Message Studio
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
            Gemini 1.5 Flash Personalization
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Strict source-backed email (60–90 words) & Instagram DM (15–30 words) generator with prompt injection defenses.
        </p>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Creator Selector Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Select Creator:</label>
          <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className="w-full md:w-80 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {creators.map((c) => (
              <option key={c.channel_id} value={c.channel_id}>
                {c.title} ({c.classification?.decision ?? 'review'}) — {c.metrics?.subscriber_count ? `${Number(c.metrics.subscriber_count).toLocaleString()} subs` : 'hidden'}
              </option>
            ))}
          </select>
        </div>

        {/* Creator Info Snippet */}
        {currentCreator && (
          <div className="flex items-center gap-3 text-xs">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isQualified
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {currentCreator.classification?.decision ?? (isQualified ? 'pass' : 'needs_review')}
            </span>
            <span className="text-slate-400">
              Email: <span className="text-slate-200 font-medium">{currentCreator.enrichment?.contact_email}</span>
            </span>
          </div>
        )}
      </div>

      {/* Ineligible Creator Warning Banner */}
      {!isQualified && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">Ineligible Creator Safety Gate:</span> This creator is marked as{' '}
              <span className="font-bold uppercase">{currentCreator?.classification?.decision}</span>. Generation is gated by default to protect campaign budget.
            </div>
          </div>
          <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer text-[11px] font-semibold bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/30">
            <input
              type="checkbox"
              checked={allowOverride}
              onChange={(e) => setAllowOverride(e.target.checked)}
              className="accent-amber-500"
            />
            Override Safety Gate
          </label>
        </div>
      )}

      {/* Main Two-Pane View: Generation Options & Message Drafts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Pane: Personalization Evidence & Generation Controls */}
        <div className="space-y-4">
          {/* Generation Controls Card */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bot className="h-4 w-4 text-purple-400" />
              Generation Engine
            </h2>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer">
                <div>
                  <div className="font-semibold text-slate-200">Force Mock LLM Provider</div>
                  <div className="text-[10px] text-slate-500">Deterministic local synthesis for testing</div>
                </div>
                <input
                  type="checkbox"
                  checked={forceMock}
                  onChange={(e) => setForceMock(e.target.checked)}
                  className="accent-purple-500"
                />
              </label>
            </div>

            <button
              onClick={handleGenerateCopy}
              disabled={generating || (!isQualified && !allowOverride)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating Personalized Copy...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {currentMessage ? 'Regenerate Drafts' : 'Generate Outreach Copy'}
                </>
              )}
            </button>
          </div>

          {/* Personalization Evidence Box */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Info className="h-4 w-4 text-indigo-400" />
              Source Evidence Audit
            </h2>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Verified Channel Themes</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentCreator?.enrichment?.content_themes && currentCreator.enrichment.content_themes.length > 0 ? (
                    currentCreator.enrichment.content_themes.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-medium">
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">No themes extracted</span>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Recent Video Upload Sample</span>
                <span className="text-slate-300 text-[11px] block mt-1 line-clamp-2">
                  {currentCreator?.enrichment?.recent_video_titles && currentCreator.enrichment.recent_video_titles.length > 0
                    ? currentCreator.enrichment.recent_video_titles[0]
                    : 'No public video titles recorded'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Campaign Value Proposition</span>
                <span className="text-slate-300 text-[11px] block mt-1">
                  EDXSO: AI Engineering & Python Career Mastery
                </span>
              </div>

              {currentMessage && (
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
                  <div>Model: <code className="text-slate-400">{currentMessage.model_name}</code></div>
                  <div>Provider: <code className="text-slate-400">{currentMessage.provider_name}</code> {currentMessage.is_mock && '(Mock Mode)'}</div>
                  <div>Safety Version: <code className="text-slate-400">{currentMessage.prompt_version}</code></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Two Message Drafts (Email & Instagram DM) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Email Draft Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Collaboration Email Pitch
                </h2>
              </div>

              {/* Strict Word Count Badge */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Word Count:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  emailWordCount >= 60 && emailWordCount <= 90
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {emailWordCount} words (Target: 60–90)
                </span>
              </div>
            </div>

            {/* Subject Line */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Subject Line</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => {
                  setEmailSubject(e.target.value);
                  setIsEditing(true);
                }}
                placeholder="Collaboration email subject..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            {/* Email Body */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Email Body</label>
              <textarea
                rows={6}
                value={emailBody}
                onChange={(e) => {
                  setEmailBody(e.target.value);
                  setIsEditing(true);
                }}
                placeholder="Personalized pitch body strictly 60–90 words..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
              />
            </div>
          </div>

          {/* Instagram DM Card */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-pink-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Instagram DM Copy
                </h2>
              </div>

              {/* Strict DM Word Count Badge */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Word Count:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  dmWordCount >= 15 && dmWordCount <= 30
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {dmWordCount} words (Target: 15–30)
                </span>
              </div>
            </div>

            <div>
              <textarea
                rows={3}
                value={instagramDm}
                onChange={(e) => {
                  setInstagramDm(e.target.value);
                  setIsEditing(true);
                }}
                placeholder="Concise DM copy strictly 15–30 words..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Draft Approval & Action Bar */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Status:</span>
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                currentMessage?.status === 'approved'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : currentMessage?.status === 'rejected'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {currentMessage?.status ?? 'Unsaved / Draft'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isEditing && currentMessage && (
                <button
                  onClick={handleSaveEdits}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
                >
                  Save Modifications
                </button>
              )}

              {currentMessage && (
                <>
                  <button
                    onClick={() => handleUpdateStatus('approved')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Approve Draft
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('rejected')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
