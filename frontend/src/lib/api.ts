const API_BASE_URL = '/api';

export class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers: HeadersInit = {
    'Accept': 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userProfile');
      const isLoginPath = window.location.pathname.endsWith('login');
      if (!isLoginPath) {
        window.location.href = '/login';
      }
    }
    throw new APIError('Unauthorized', 401);
  }

  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new APIError(response.statusText || 'Request failed', response.status);
    }
    return {} as T;
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || 'Request failed';
    throw new APIError(errorMsg, response.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: any, options?: RequestInit) => request<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: any, options?: RequestInit) => request<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any, options?: RequestInit) => request<T>(path, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { ...options, method: 'DELETE' }),
};
