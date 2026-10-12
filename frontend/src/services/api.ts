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
        detail = body.detail || body.message || detail;
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
  getCreators: (params?: { is_synthetic?: boolean; is_qualified?: boolean; search?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.is_synthetic !== undefined) searchParams.set('is_synthetic', String(params.is_synthetic));
    if (params?.is_qualified !== undefined) searchParams.set('is_qualified', String(params.is_qualified));
    if (params?.search) searchParams.set('search_query', params.search);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return request<CreatorRecord[]>(`/creators${qs ? `?${qs}` : ''}`);
  },
};
