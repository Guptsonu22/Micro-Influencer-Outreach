import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Key,
  Database,
  ExternalLink,
  Save,
  Sparkles
} from 'lucide-react';
import { SystemHealth, CampaignProfile } from '../types';
import { api } from '../services/api';

interface SettingsPageProps {
  health: SystemHealth | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  health,
  onRefresh,
}) => {
  // Campaign Configuration State (non-secret preferences)
  const [campaignName, setCampaignName] = useState<string>('EDXSO Developer Outreach Q4');
  const [targetNiche, setTargetNiche] = useState<string>('Technology & Artificial Intelligence');
  const [brandName, setBrandName] = useState<string>('EDXSO');
  const [brandDescription, setBrandDescription] = useState<string>(
    'EDXSO builds next-generation AI-powered career training and interactive developer tools.'
  );
  const [offerDetails, setOfferDetails] = useState<string>(
    'Paid sponsorship ($250-$800) + free Pro access for the creator\'s community.'
  );
  const [callToAction, setCallToAction] = useState<string>(
    'Reply to this message or book a 10-minute briefing call: cal.com/edxso/partnerships'
  );

  // Status feedback
  const [isSavingCampaign, setIsSavingCampaign] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savedCampaigns, setSavedCampaigns] = useState<CampaignProfile[]>([]);

  // Load campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const camps = await api.listCampaigns(5);
        setSavedCampaigns(camps);
        if (camps.length > 0) {
          const first = camps[0];
          setCampaignName(first.name);
          setTargetNiche(first.target_niche);
          setBrandName(first.brand_name);
          setBrandDescription(first.brand_description);
          setOfferDetails(first.offer_details);
          setCallToAction(first.call_to_action);
        }
      } catch {
        // Fallback to default
      }
    };
    fetchCampaigns();
  }, []);

  const handleSaveCampaignPreferences = async () => {
    setIsSavingCampaign(true);
    setFeedback(null);
    try {
      await api.createCampaign({
        name: campaignName,
        target_niche: targetNiche,
        brand_name: brandName,
        brand_description: brandDescription,
        offer_details: offerDetails,
        call_to_action: callToAction,
        min_subscribers: 5000,
        max_subscribers: 100000,
        min_engagement_rate: 2.0,
        required_keywords: ['python', 'ai', 'coding', 'software', 'tech', 'tutorial', 'engineer'],
        require_contact_email: false,
      });

      setFeedback({ type: 'success', text: 'Campaign configuration preferences saved to backend database!' });
      const camps = await api.listCampaigns(5);
      setSavedCampaigns(camps);
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to save campaign settings.' });
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const ytConfigured = health?.integrations.youtube_api_configured ?? false;
  const geminiConfigured = health?.integrations.gemini_api_configured ?? false;
  const dbConnected = health?.database.status === 'connected';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          Settings & Integrations
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
            System Security & Rules
          </span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Inspect backend service connectivity without exposing secrets, and configure non-secret campaign variables.
        </p>
      </div>

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

      {/* Integration Status Cards (No secrets revealed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* YouTube API Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">YouTube Data API v3</span>
              {ytConfigured ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Missing
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Used for channel search queries, 50-item batch hydration, and recent video sampling.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">Status:</span>
            {ytConfigured ? (
              <span className="text-emerald-400">API Key is active in server environment.</span>
            ) : (
              <span className="text-amber-300">Set `YOUTUBE_API_KEY` in .env or run in Demo Mode.</span>
            )}
          </div>
        </div>

        {/* Gemini API Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Gemini 1.5 Flash</span>
              {geminiConfigured ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Configured
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Mock Fallback
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates personalized 60–90w email pitches and 15–30w Instagram DMs with injection safety.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">Status:</span>
            {geminiConfigured ? (
              <span className="text-emerald-400">Online ({health?.integrations.gemini_model})</span>
            ) : (
              <span className="text-purple-300">Deterministic Mock Provider active (Offline ready).</span>
            )}
          </div>
        </div>

        {/* Database & Persistence Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">MongoDB Storage</span>
              {dbConnected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                  <Database className="h-3 w-3" /> In-Memory Mode
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stores influencer records, outreach audit logs, and message drafts with compound indexes.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 block mb-1">Status:</span>
            {dbConnected ? (
              <span className="text-emerald-400">Connected to persistent MongoDB.</span>
            ) : (
              <span className="text-blue-300">Seamless high-performance in-memory fallback adapter.</span>
            )}
          </div>
        </div>
      </div>

      {/* Setup Instructions for Missing Credentials */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Key className="h-4 w-4 text-indigo-400" />
          Instructions For Configuring API Credentials
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* YouTube Setup */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">1. YouTube Data API v3 Key</span>
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Google Cloud Console <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Log in to Google Cloud Console and create or select a project.</li>
              <li>Enable the <strong>YouTube Data API v3</strong> in the API Library.</li>
              <li>Go to <strong>Credentials</strong> &gt; <strong>Create Credentials</strong> &gt; <strong>API Key</strong>.</li>
              <li>Paste the key into the root <code className="text-indigo-300">.env</code> as <code className="text-indigo-300">YOUTUBE_API_KEY=your_key</code>.</li>
            </ol>
          </div>

          {/* Gemini Setup */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">2. Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                Google AI Studio <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Visit Google AI Studio and click <strong>Get API key</strong>.</li>
              <li>Create a free key for your project.</li>
              <li>Paste the key into root <code className="text-purple-300">.env</code> as <code className="text-purple-300">GEMINI_API_KEY=your_key</code>.</li>
              <li>The system will automatically switch from Mock Provider to Gemini 1.5 Flash.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Non-secret Campaign Configuration Preferences Form */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Campaign Brand Profile & Personalization Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            These variables are securely passed into the Gemini prompt template for personalized message synthesis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Campaign Title</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Target Niche Vertical</label>
            <input
              type="text"
              value={targetNiche}
              onChange={(e) => setTargetNiche(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Brand Value Proposition</label>
            <input
              type="text"
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Offer & Compensation Structure</label>
            <input
              type="text"
              value={offerDetails}
              onChange={(e) => setOfferDetails(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Call to Action (CTA)</label>
            <input
              type="text"
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            onClick={handleSaveCampaignPreferences}
            disabled={isSavingCampaign}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition"
          >
            {isSavingCampaign ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Campaign Preferences
              </>
            )}
          </button>

          {savedCampaigns.length > 0 && (
            <div className="text-xs text-slate-400">
              <span className="text-slate-500">Active Profile:</span>{' '}
              <span className="font-semibold text-slate-200">{savedCampaigns[0].name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
