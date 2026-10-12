import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Download,
  ExternalLink,
  Mail,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  RefreshCw,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { CreatorRecord } from '../types';
import { api } from '../services/api';

interface InfluencerExplorerPageProps {
  creators: CreatorRecord[];
  loading: boolean;
  onRefresh: () => void;
  onSelectCreatorForStudio?: (creator: CreatorRecord) => void;
}

export const InfluencerExplorerPage: React.FC<InfluencerExplorerPageProps> = ({
  creators,
  loading,
  onRefresh,
  onSelectCreatorForStudio,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'pass' | 'needs_review' | 'fail'>('all');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [subRangeFilter, setSubRangeFilter] = useState<'all' | 'micro' | 'under5k' | 'over100k'>('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState<'all' | 'available' | 'missing'>('all');
  const [sortField, setSortField] = useState<'subscribers' | 'views' | 'engagement' | 'fit_score'>('fit_score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  // Selected Creator for Detail Drawer
  const [selectedCreator, setSelectedCreator] = useState<CreatorRecord | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available unique niches
  const niches = useMemo(() => {
    const set = new Set<string>();
    creators.forEach((c) => {
      if (c.classification?.niche) set.add(c.classification.niche);
    });
    return Array.from(set);
  }, [creators]);

  // Filtering & Sorting pipeline
  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      // 1. Text search across title, handle, bio
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = c.title?.toLowerCase().includes(q);
        const handleMatch = c.custom_url?.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        if (!titleMatch && !handleMatch && !descMatch) return false;
      }

      // 2. Decision filter
      if (decisionFilter !== 'all') {
        const dec = c.classification?.decision ?? (c.classification?.is_qualified ? 'pass' : 'fail');
        if (dec !== decisionFilter) return false;
      }

      // 3. Niche filter
      if (nicheFilter !== 'all' && c.classification?.niche !== nicheFilter) {
        return false;
      }

      // 4. Subscriber range
      const subs = c.metrics?.subscriber_count ?? 0;
      if (subRangeFilter === 'micro' && (subs < 5000 || subs > 100000)) return false;
      if (subRangeFilter === 'under5k' && subs >= 5000) return false;
      if (subRangeFilter === 'over100k' && subs <= 100000) return false;

      // 5. Email status
      const hasEmail = c.enrichment?.contact_email &&
        c.enrichment.contact_email.trim() !== '' &&
        c.enrichment.contact_email.toLowerCase() !== 'not found';
      if (emailStatusFilter === 'available' && !hasEmail) return false;
      if (emailStatusFilter === 'missing' && hasEmail) return false;

      return true;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'subscribers') {
        valA = a.metrics?.subscriber_count ?? 0;
        valB = b.metrics?.subscriber_count ?? 0;
      } else if (sortField === 'views') {
        valA = a.metrics?.avg_recent_views ?? a.metrics?.view_count ?? 0;
        valB = b.metrics?.avg_recent_views ?? b.metrics?.view_count ?? 0;
      } else if (sortField === 'engagement') {
        valA = a.metrics?.estimated_engagement_rate ?? 0;
        valB = b.metrics?.estimated_engagement_rate ?? 0;
      } else if (sortField === 'fit_score') {
        valA = a.classification?.fit_score ?? 0;
        valB = b.classification?.fit_score ?? 0;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [creators, searchQuery, decisionFilter, nicheFilter, subRangeFilter, emailStatusFilter, sortField, sortAsc]);

  // Paginated slice
  const totalPages = Math.ceil(filteredCreators.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCreators.slice(start, start + pageSize);
  }, [filteredCreators, currentPage, pageSize]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Open detail drawer
  const handleOpenDrawer = (creator: CreatorRecord) => {
    setSelectedCreator(creator);
    setManualEmail(
      creator.enrichment?.contact_email && creator.enrichment.contact_email.toLowerCase() !== 'not found'
        ? creator.enrichment.contact_email
        : ''
    );
    setSourceUrl(creator.enrichment?.email_source_url || '');
    setFeedbackMsg(null);
  };

  // Save manual contact email
  const handleSaveContactEmail = async () => {
    if (!selectedCreator || !manualEmail.trim()) return;
    setIsUpdatingEmail(true);
    setFeedbackMsg(null);
    try {
      const updated = await api.updateContactEmail(selectedCreator.channel_id, manualEmail.trim(), sourceUrl.trim() || undefined);
      setSelectedCreator(updated);
      setFeedbackMsg({ type: 'success', text: 'Contact email saved & verified successfully!' });
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update email.' });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Re-run profile enrichment
  const handleTriggerEnrichment = async () => {
    if (!selectedCreator) return;
    setIsEnriching(true);
    setFeedbackMsg(null);
    try {
      const enriched = await api.enrichSingle(selectedCreator.channel_id);
      setSelectedCreator(enriched);
      setFeedbackMsg({ type: 'success', text: 'Profile re-analyzed and content themes refreshed!' });
      onRefresh();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Enrichment failed.' });
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Influencer Explorer
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
              {filteredCreators.length} of {creators.length} Creators
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search, filter, inspect provenance reasons, and verify creator contact data.
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <a
            href={api.getExportUrl('csv', decisionFilter !== 'all' ? decisionFilter : undefined)}
            download="influencers_export.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
          <a
            href={api.getExportUrl('json', decisionFilter !== 'all' ? decisionFilter : undefined)}
            download="influencers_export.json"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        {/* Row 1: Search and Primary Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search creator name, handle, or bio..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <select
              value={decisionFilter}
              onChange={(e) => {
                setDecisionFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">Classification: All</option>
              <option value="pass">Pass (Qualified)</option>
              <option value="needs_review">Needs Review</option>
              <option value="fail">Fail (Rejected)</option>
            </select>
          </div>

          <div>
            <select
              value={subRangeFilter}
              onChange={(e) => {
                setSubRangeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="all">Subscribers: All Ranges</option>
              <option value="micro">Target Micro (5k - 100k)</option>
              <option value="under5k">&lt; 5k (Emerging)</option>
              <option value="over100k">&gt; 100k (Macro)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Filters & Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2 border-t border-slate-800/60 text-xs">
          <div>
            <select
              value={nicheFilter}
              onChange={(e) => {
                setNicheFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Niches</option>
              {niches.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={emailStatusFilter}
              onChange={(e) => {
                setEmailStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Email: Any Status</option>
              <option value="available">Email Discovered</option>
              <option value="missing">Email Missing (Not Found)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 sm:col-span-1 md:col-span-2 justify-end">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="fit_score">Fit Score</option>
              <option value="subscribers">Subscribers</option>
              <option value="engagement">Engagement Rate</option>
              <option value="views">Avg Views</option>
            </select>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              title={sortAsc ? 'Ascending' : 'Descending'}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Influencer Grid / Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading influencer records...</p>
        </div>
      ) : paginatedList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedList.map((creator) => {
            const decision = creator.classification?.decision || (creator.classification?.is_qualified ? 'pass' : 'fail');
            const hasEmail = creator.enrichment?.contact_email &&
              creator.enrichment.contact_email.trim() !== '' &&
              creator.enrichment.contact_email.toLowerCase() !== 'not found';

            return (
              <div
                key={creator.channel_id}
                className="rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 p-5 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-black/30 group"
              >
                <div>
                  {/* Card Header: Avatar & Decision Pill */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {creator.thumbnail_url ? (
                        <img
                          src={creator.thumbnail_url}
                          alt={creator.title}
                          className="h-10 w-10 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                          {creator.title.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h2 className="text-sm font-bold text-white group-hover:text-indigo-400 transition truncate max-w-[170px]" title={creator.title}>
                          {creator.title}
                        </h2>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>{creator.custom_url !== 'Unavailable' ? creator.custom_url : 'YouTube'}</span>
                          <a
                            href={creator.channel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-300"
                            title="Visit YouTube Channel"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Decision Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                      decision === 'pass'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : decision === 'needs_review'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {decision === 'pass' && <CheckCircle2 className="h-3 w-3" />}
                      {decision === 'needs_review' && <HelpCircle className="h-3 w-3" />}
                      {decision === 'fail' && <XCircle className="h-3 w-3" />}
                      {decision}
                    </span>
                  </div>

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">Subscribers</div>
                      <div className="text-xs font-bold text-slate-200">
                        {creator.metrics?.subscriber_count != null
                          ? Number(creator.metrics.subscriber_count).toLocaleString()
                          : 'Hidden'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Engagement</div>
                      <div className="text-xs font-bold text-indigo-400">
                        {creator.metrics?.estimated_engagement_rate != null
                          ? `${creator.metrics.estimated_engagement_rate}%`
                          : 'Unavailable'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Fit Score</div>
                      <div className="text-xs font-bold text-purple-400">
                        {creator.classification?.fit_score ?? 0}/100
                      </div>
                    </div>
                  </div>

                  {/* Decision Reasons Preview */}
                  <div className="mb-3 space-y-1">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Qualification Audit</div>
                    {creator.classification?.reasons && creator.classification.reasons.length > 0 ? (
                      <div className="text-[11px] text-slate-300 line-clamp-2 bg-slate-950/40 p-2 rounded border border-slate-800">
                        {creator.classification.reasons[0]}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic">No automated reasons recorded</div>
                    )}
                  </div>

                  {/* Contact Email Status Pill */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      {hasEmail ? (
                        <span className="text-emerald-400 font-medium truncate max-w-[150px]">
                          {creator.enrichment.contact_email}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Email Not Found</span>
                      )}
                    </div>
                    {creator.is_synthetic && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold uppercase">
                        DEMO DATA
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenDrawer(creator)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Inspect Provenance
                  </button>

                  {onSelectCreatorForStudio && (
                    <button
                      onClick={() => onSelectCreatorForStudio(creator)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                      title="Generate outreach draft in AI Message Studio"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Draft Copy
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
          <Search className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-slate-300">No matching influencers found</h2>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <div>
            Showing Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Creator Detail & Provenance Inspector Drawer / Modal */}
      {selectedCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5">
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                {selectedCreator.thumbnail_url ? (
                  <img
                    src={selectedCreator.thumbnail_url}
                    alt={selectedCreator.title}
                    className="h-12 w-12 rounded-full object-cover border border-slate-700"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-base border border-indigo-500/30">
                    {selectedCreator.title.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedCreator.title}
                    {selectedCreator.is_synthetic && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        DEMO RECORD
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>ID: <code className="text-indigo-400">{selectedCreator.channel_id}</code></span>
                    <span>•</span>
                    <a
                      href={selectedCreator.channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      Canonical Channel <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCreator(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notification messages */}
            {feedbackMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}>
                {feedbackMsg.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {feedbackMsg.text}
              </div>
            )}

            {/* Granular Decision Breakdown & Criteria */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                Qualification Breakdown & Decision Provenance
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Overall Decision</div>
                  <div className="font-bold text-white capitalize mt-0.5">
                    {selectedCreator.classification?.decision ?? 'needs_review'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Fit Score</div>
                  <div className="font-bold text-purple-400 mt-0.5">
                    {selectedCreator.classification?.fit_score ?? 0} / 100
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Niche Fit</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {selectedCreator.classification?.niche_relevance?.status ?? 'pass'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] text-slate-500">Subscriber Fit</div>
                  <div className="font-bold text-indigo-400 mt-0.5">
                    {selectedCreator.classification?.follower_count?.status ?? 'pass'}
                  </div>
                </div>
              </div>

              {/* Reasons List */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
                <span className="font-semibold text-slate-300">Detailed Evaluated Reasons:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  {selectedCreator.classification?.reasons && selectedCreator.classification.reasons.length > 0 ? (
                    selectedCreator.classification.reasons.map((r, i) => <li key={i}>{r}</li>)
                  ) : (
                    <li>Criterion evaluated successfully with no rejection flags.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Metrics Provenance Box */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metrics Transparency</h3>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-300">
                  <span>Engagement Formula:</span>
                  <code className="text-[11px] text-indigo-400">{selectedCreator.metrics?.engagement_formula_used}</code>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-300">
                  <span>Observation Window:</span>
                  <span className="text-slate-400">{selectedCreator.metrics?.observation_window || 'Last 10 public uploads'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5 text-slate-300">
                  <span>Avg Sampled Views / Likes:</span>
                  <span className="text-slate-400">
                    {selectedCreator.metrics?.avg_recent_views ? Math.round(selectedCreator.metrics.avg_recent_views).toLocaleString() : 'Unavailable'} views / {' '}
                    {selectedCreator.metrics?.avg_recent_likes ? Math.round(selectedCreator.metrics.avg_recent_likes).toLocaleString() : 'Unavailable'} likes
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Collection Timestamp:</span>
                  <span className="text-slate-400">{new Date(selectedCreator.retrieved_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Verified Content Themes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Content Themes</h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedCreator.enrichment?.content_themes && selectedCreator.enrichment.content_themes.length > 0 ? (
                  selectedCreator.enrichment.content_themes.map((theme, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                      #{theme}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No extracted themes yet.</span>
                )}
              </div>
            </div>

            {/* Contact Information & Manual Verification */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Email Verification</h3>
                <button
                  onClick={handleTriggerEnrichment}
                  disabled={isEnriching}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${isEnriching ? 'animate-spin' : ''}`} />
                  Re-enrich Profile
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Business Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. partnerships@creator.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Source URL (Proof)</label>
                  <input
                    type="url"
                    placeholder="e.g. https://creator.com/contact"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveContactEmail}
                disabled={isUpdatingEmail || !manualEmail.trim()}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow transition"
              >
                {isUpdatingEmail ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save & Verify Contact Information
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
