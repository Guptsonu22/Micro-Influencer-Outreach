import {
  SystemHealth,
  CreatorRecord,
  PaginatedResponse,
  DiscoveryRunResponse,
  GeneratedMessageResponse,
  OutreachLogResponse,
  OutreachLogCreate,
  OutreachSendRequest,
  OutreachDispatchResponse,
  InstagramDMCopyResponse,
  CampaignProfile,
  BatchClassificationResponse
} from '../types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail || body.message || body.error?.message || detail;
      } catch {
        // use default statusText
      }
      throw new ApiError(res.status, detail);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(0, err.message || 'Network request failed. Is the backend server running?');
  }
}

export const api = {
  // System Health
  getHealth: () => request<SystemHealth>('/health'),

  // Influencers & Pipeline
  getCreators: (params?: {
    page?: number;
    page_size?: number;
    decision?: string;
    is_synthetic?: boolean;
    is_qualified?: boolean;
    min_subscribers?: number;
    max_subscribers?: number;
    search_query?: string;
    niche?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    if (params?.decision && params.decision !== 'all') searchParams.set('decision', params.decision);
    if (params?.is_synthetic !== undefined) searchParams.set('is_synthetic', String(params.is_synthetic));
    if (params?.is_qualified !== undefined) searchParams.set('is_qualified', String(params.is_qualified));
    if (params?.min_subscribers !== undefined) searchParams.set('min_subscribers', String(params.min_subscribers));
    if (params?.max_subscribers !== undefined) searchParams.set('max_subscribers', String(params.max_subscribers));
    if (params?.search_query) searchParams.set('search_query', params.search_query);
    if (params?.niche) searchParams.set('niche', params.niche);
    const qs = searchParams.toString();
    return request<PaginatedResponse<CreatorRecord>>(`/influencers${qs ? `?${qs}` : ''}`);
  },

  getInfluencer: (channelId: string) => {
    return request<CreatorRecord>(`/influencers/${channelId}`);
  },

  classifyAll: (criteria: any) => {
    return request<BatchClassificationResponse>('/influencers/classify', {
      method: 'POST',
      body: JSON.stringify(criteria),
    });
  },

  enrichSingle: (channelId: string) => {
    return request<CreatorRecord>(`/influencers/${channelId}/enrich`, {
      method: 'POST',
    });
  },

  updateContactEmail: (channelId: string, email: string, sourceUrl?: string) => {
    return request<CreatorRecord>(`/influencers/${channelId}/contact`, {
      method: 'PUT',
      body: JSON.stringify({
        contact_email: email,
        source_url: sourceUrl,
      }),
    });
  },

  // Discovery Engine
  triggerDiscovery: (payload: {
    queries?: string[];
    target_count?: number;
    max_quota_budget?: number;
    min_subscribers?: number;
    max_subscribers?: number;
    region_code?: string;
    use_demo_mode?: boolean;
  }) => {
    return request<DiscoveryRunResponse>('/discovery/runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDiscoveryRun: (runId: string) => {
    return request<DiscoveryRunResponse>(`/discovery/runs/${runId}`);
  },

  listDiscoveryRuns: (limit: number = 20) => {
    return request<DiscoveryRunResponse[]>(`/discovery/runs?limit=${limit}`);
  },

  getExportUrl: (format: 'csv' | 'json', decision?: string, onlyQualified?: boolean) => {
    const q = new URLSearchParams({ format });
    if (decision && decision !== 'all') q.set('decision', decision);
    if (onlyQualified !== undefined) q.set('is_qualified', String(onlyQualified));
    return `${API_BASE}/influencers/export?${q.toString()}`;
  },

  // AI Message Studio
  generateMessage: (payload: {
    channel_id: string;
    creator_id?: string;
    campaign_id?: string;
    allow_ineligible_override?: boolean;
    force_mock?: boolean;
  }) => {
    return request<GeneratedMessageResponse>('/messages/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listMessages: (params?: { channel_id?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.channel_id) q.set('channel_id', params.channel_id);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<GeneratedMessageResponse[]>(`/messages${qs ? `?${qs}` : ''}`);
  },

  getMessage: (messageId: string) => {
    return request<GeneratedMessageResponse>(`/messages/${messageId}`);
  },

  editMessage: (messageId: string, payload: {
    email_subject?: string;
    email_body?: string;
    instagram_dm?: string;
    status?: string;
  }) => {
    return request<GeneratedMessageResponse>(`/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  updateMessageStatus: (messageId: string, newStatus: string) => {
    return request<GeneratedMessageResponse>(`/messages/${messageId}/status?new_status=${newStatus}`, {
      method: 'PUT',
    });
  },

  // Outreach Tracker & Gatekeeper
  sendOutreach: (payload: OutreachSendRequest) => {
    return request<OutreachDispatchResponse>('/outreach/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getInstagramDmCopy: (channelId: string) => {
    return request<InstagramDMCopyResponse>(`/outreach/instagram-dm/${channelId}`);
  },

  getOutreachExportUrl: (format: 'csv' | 'json' = 'csv') => {
    return `${API_BASE}/outreach/export?format=${format}`;
  },

  recordOutreach: (payload: OutreachLogCreate) => {
    return request<OutreachLogResponse>('/outreach/logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listOutreachLogs: (paramsOrLimit?: number | { limit?: number; status?: string; channel_type?: string }) => {
    let limit = 50;
    let status: string | undefined;
    let channel_type: string | undefined;
    if (typeof paramsOrLimit === 'number') {
      limit = paramsOrLimit;
    } else if (paramsOrLimit) {
      limit = paramsOrLimit.limit || 50;
      status = paramsOrLimit.status;
      channel_type = paramsOrLimit.channel_type;
    }
    const q = new URLSearchParams();
    if (limit) q.set('limit', String(limit));
    if (status && status !== 'all') q.set('status', status);
    if (channel_type && channel_type !== 'all') q.set('channel_type', channel_type);
    const qs = q.toString();
    return request<OutreachLogResponse[]>(`/outreach/logs${qs ? `?${qs}` : ''}`);
  },

  // Campaigns & Settings
  createCampaign: (payload: Partial<CampaignProfile>) => {
    return request<CampaignProfile>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listCampaigns: (limit: number = 20) => {
    return request<CampaignProfile[]>(`/campaigns?limit=${limit}`);
  },

  getCampaign: (campaignId: string) => {
    return request<CampaignProfile>(`/campaigns/${campaignId}`);
  },
};
