import { SystemHealth, CreatorRecord } from '../types';

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
  getHealth: () => request<SystemHealth>('/health'),

  getCreators: (params?: {
    page?: number;
    page_size?: number;
    is_synthetic?: boolean;
    is_qualified?: boolean;
    search_query?: string;
    niche?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    if (params?.is_synthetic !== undefined) searchParams.set('is_synthetic', String(params.is_synthetic));
    if (params?.is_qualified !== undefined) searchParams.set('is_qualified', String(params.is_qualified));
    if (params?.search_query) searchParams.set('search_query', params.search_query);
    if (params?.niche) searchParams.set('niche', params.niche);
    const qs = searchParams.toString();
    return request<any>(`/influencers${qs ? `?${qs}` : ''}`);
  },

  triggerDiscovery: (payload: {
    queries?: string[];
    target_count?: number;
    max_quota_budget?: number;
    min_subscribers?: number;
    max_subscribers?: number;
    region_code?: string;
    use_demo_mode?: boolean;
  }) => {
    return request<any>('/discovery/runs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDiscoveryRun: (runId: string) => {
    return request<any>(`/discovery/runs/${runId}`);
  },

  listDiscoveryRuns: (limit: number = 20) => {
    return request<any[]>(`/discovery/runs?limit=${limit}`);
  },

  getExportUrl: (format: 'csv' | 'json', onlyQualified?: boolean) => {
    const q = new URLSearchParams({ format });
    if (onlyQualified !== undefined) q.set('is_qualified', String(onlyQualified));
    return `${API_BASE}/influencers/export?${q.toString()}`;
  },
};
