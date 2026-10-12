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
  engagement_formula_used: string;
  metric_timestamp: string;
}

export interface EnrichmentData {
  contact_email: string; // Strictly "Not Found" if missing
  social_links: Record<string, string>;
  content_themes: string[];
  recent_video_titles: string[];
  enriched_at: string | null;
  enrichment_source: string;
}

export interface ClassificationResult {
  is_qualified: boolean;
  fit_score: number;
  niche: string;
  reasons: string[];
  evaluated_at: string;
}

export interface OutreachMessage {
  email_subject: string | null;
  email_body: string | null;
  instagram_dm: string | null;
  generated_at: string | null;
  status: 'draft' | 'approved' | 'simulated' | 'sent' | 'failed';
  approval_timestamp: string | null;
  delivery_timestamp: string | null;
  is_simulation: boolean;
  error_message: string | null;
}

export interface CreatorRecord {
  channel_id: string;
  title: string;
  custom_url: string;
  channel_url: string;
  description: string;
  published_at: string;
  country: string;
  thumbnail_url: string | null;
  metrics: CreatorMetrics;
  enrichment: EnrichmentData;
  classification: ClassificationResult;
  outreach: OutreachMessage;
  is_synthetic: boolean;
  source_api: string;
  retrieved_at: string;
  updated_at: string;
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

export interface FilterCriteria {
  min_subscribers: number;
  max_subscribers: number;
  min_engagement_rate: number;
  target_niches: string[];
  required_keywords: string[];
  require_contact_email: boolean;
}

export interface DiscoveryRequest {
  query: string;
  target_count: number;
  region_code: string;
  use_demo_mode: boolean;
}
