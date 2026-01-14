import type {
  Download,
  ProviderSearchResult,
  User,
  PaginatedResponse,
  ApiResponse
} from '@movie-server/shared';

const API_BASE = '';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth
export async function login(username: string, password: string): Promise<User> {
  const response = await fetchApi<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return response.data!.user;
}

export async function signup(username: string, password: string, confirmPassword: string): Promise<User> {
  const response = await fetchApi<{ user: User }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, password, confirmPassword }),
  });
  return response.data!.user;
}

export async function logout(): Promise<void> {
  await fetchApi('/api/auth/logout', { method: 'POST' });
}

export async function getCurrentUser(): Promise<{ user: User; ntfyTopic: string | null } | null> {
  try {
    const response = await fetchApi<{ user: User; ntfyTopic: string | null }>('/api/auth/me');
    return response.data ?? null;
  } catch {
    return null;
  }
}

// Providers
export async function getProviders(): Promise<Array<{ name: string; displayName: string }>> {
  const response = await fetchApi<{ providers: Array<{ name: string; displayName: string }> }>('/api/providers');
  return response.data?.providers ?? [];
}

// Downloads
export async function searchProvider(
  query: string,
  provider: string
): Promise<ProviderSearchResult[]> {
  const response = await fetchApi<{ results: ProviderSearchResult[] }>('/api/downloads/request', {
    method: 'POST',
    body: JSON.stringify({ query, provider }),
  });
  return response.data?.results ?? [];
}

export async function confirmDownload(
  provider: string,
  resultId: string
): Promise<Download> {
  const response = await fetchApi<{ download: Download }>('/api/downloads/confirm', {
    method: 'POST',
    body: JSON.stringify({ provider, resultId }),
  });
  return response.data!.download;
}

export async function getDownloads(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Download>> {
  const response = await fetchApi<PaginatedResponse<Download>>(
    `/api/downloads?page=${page}&pageSize=${pageSize}`
  );
  return response.data!;
}

export async function pauseDownload(id: string): Promise<Download> {
  const response = await fetchApi<{ download: Download }>(`/api/downloads/${id}/pause`, {
    method: 'POST',
  });
  return response.data!.download;
}

export async function resumeDownload(id: string): Promise<Download> {
  const response = await fetchApi<{ download: Download }>(`/api/downloads/${id}/resume`, {
    method: 'POST',
  });
  return response.data!.download;
}

export async function cancelDownload(id: string): Promise<Download> {
  const response = await fetchApi<{ download: Download }>(`/api/downloads/${id}/cancel`, {
    method: 'POST',
  });
  return response.data!.download;
}

export async function deleteDownload(id: string): Promise<void> {
  await fetchApi(`/api/downloads/${id}`, {
    method: 'DELETE',
  });
}
