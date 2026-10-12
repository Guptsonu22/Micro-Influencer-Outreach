export interface CreatorMetrics {
  subscriber_count: number | null;
  is_subscriber_count_hidden: boolean;
  video_count: number | null;
  view_count: number | null;
  recent_video_sample_size: number;
  avg_recent_views: number | null;
  avg_recent_likes: number | null;
  avg_recent_comments: number | null;
  estimated_engagement_rate: number | null;
  is_estimated?: boolean;
  engagement_formula_used: string;
  observation_window?: string;
  metric_timestamp: string;
}

export interface EnrichmentData {
  contact_email: string; // Strictly "Not Found" if missing
  email_source?: string;
  email_verification_status?: string;
  email_source_url?: string | null;
  social_links: Record<string, string>;
  content_themes: string[];
  recent_video_titles: string[];
  audience_demographics?: string; // Strictly "Unavailable"
  enriched_at: string | null;
  enrichment_source: string;
  last_verified_at?: string | null;
}

export interface CriterionResult {
  status: 'pass' | 'fail' | 'needs_review';
  score?: number | null;
  reason: string;
}

export interface ClassificationResult {
  decision: 'pass' | 'fail' | 'needs_review';
  is_qualified: boolean;
  fit_score: number;
  niche: string;
  reasons: string[];
  niche_relevance?: CriterionResult | null;
  follower_count?: CriterionResult | null;
  engagement?: CriterionResult | null;
  contact_availability?: CriterionResult | null;
  evaluated_at: string;
}

export interface OutreachMessage {
  email_subject: string | null;
  email_body: string | null;
  instagram_dm: string | null;
  generated_at: string | null;
  status: 'draft' | 'approved' | 'rejected' | 'simulated' | 'sent' | 'failed';
  approval_timestamp?: string | null;
  delivery_timestamp?: string | null;
  is_simulation?: boolean;
  error_message?: string | null;
}

export interface CreatorRecord {
  id?: string;
  channel_id: string;
  title: string;
  custom_url: string;
  channel_url: string;
  source_url?: string;
  source_name?: string;
  description: string;
  published_at: string;
  country: string;
  thumbnail_url: string | null;
  metrics: CreatorMetrics;
  enrichment: EnrichmentData;
  classification: ClassificationResult;
  outreach?: OutreachMessage;
  is_synthetic: boolean;
  source_api?: string;
  collected_at?: string;
  retrieved_at: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SystemHealth {
  status: string;
  service: string;
  environment: string;
  database: {
    status: string;
    is_persistent_mongodb: boolean;
    total_records: number;
    real_records: number;
    synthetic_records: number;
  };
  integrations: {
    youtube_api_configured: boolean;
    gemini_api_configured: boolean;
    gemini_model: string;
  };
  safety_guardrails: {
    simulation_mode: boolean;
    allow_live_email_sending: boolean;
    instagram_dm_automated_sending: boolean;
    duplicate_prevention_enabled: boolean;
  };
}

export interface DiscoverySummary {
  total_search_results: number;
  unique_channels_found: number;
  qualifying_channels: number;
  rejected_channels: number;
  quota_units_used: number;
  api_requests_count: number;
  rejection_breakdown: {
    too_few_subscribers: number;
    too_many_subscribers: number;
    hidden_subscribers: number;
    insufficient_activity: number;
    [key: string]: number;
  };
  api_errors: string[];
  continuation_instructions?: string | null;
}

export interface DiscoveryRunResponse {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'partial' | 'quota_exceeded' | 'failed';
  queries: string[];
  target_count: number;
  region_code: string;
  source_name: string;
  is_demo_run: boolean;
  summary: DiscoverySummary;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface GeneratedMessageResponse {
  id: string;
  creator_id: string;
  channel_id: string;
  campaign_id?: string | null;
  email_subject: string;
  email_body: string;
  instagram_dm: string;
  personalization_evidence: {
    creator_name?: string;
    subscriber_count?: number | null;
    verified_themes?: string[];
    recent_video_used?: string | null;
    fit_score?: number;
    campaign_brand?: string;
    [key: string]: any;
  };
  warnings: string[];
  email_word_count: number;
  dm_word_count: number;
  model_name: string;
  provider_name: string;
  is_mock: boolean;
  prompt_version: string;
  status: 'draft' | 'approved' | 'rejected';
  generated_at: string;
  approved_at?: string | null;
  updated_at?: string | null;
}

export interface OutreachLogResponse {
  id: string;
  creator_id: string;
  channel_id: string;
  message_id?: string | null;
  channel_type: 'email' | 'instagram_dm';
  recipient_contact: string;
  is_simulation: boolean;
  source_url?: string | null;
  status: 'simulated' | 'sent' | 'failed' | 'duplicate_prevented';
  timestamp: string;
  error_details?: string | null;
  audit_metadata: {
    simulation_mode?: boolean;
    ip_origin?: string;
    [key: string]: any;
  };
}

export interface OutreachLogCreate {
  creator_id: string;
  channel_id: string;
  message_id?: string;
  channel_type: 'email' | 'instagram_dm';
  recipient_contact: string;
  is_simulation: boolean;
  source_url?: string;
}

export interface CampaignProfile {
  id?: string;
  name: string;
  target_niche: string;
  min_subscribers: number;
  max_subscribers: number;
  min_engagement_rate: number;
  required_keywords: string[];
  require_contact_email: boolean;
  brand_name: string;
  brand_description: string;
  offer_details: string;
  call_to_action: string;
  created_at?: string;
  updated_at?: string;
}

export interface FilterCriteria {
  min_subscribers: number;
  max_subscribers: number;
  min_engagement_rate: number;
  target_niches: string[];
  required_keywords: string[];
  require_contact_email: boolean;
}

export interface BatchClassificationResponse {
  total_evaluated: number;
  passed_count: number;
  needs_review_count: number;
  failed_count: number;
  criterion_pass_counts: Record<string, number>;
  criteria_used: FilterCriteria;
}
