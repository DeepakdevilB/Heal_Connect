const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

interface AuthData {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    isEmailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json() as ApiResponse<T>;
  return data;
}

export const authApi = {
  register: (body: { email: string; password: string; name: string }) =>
    request<AuthData>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<AuthData>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  googleSignIn: (idToken: string) =>
    request<AuthData>('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),

  appleSignIn: (body: { appleId: string; email?: string; name?: string }) =>
    request<AuthData>('/api/auth/apple', { method: 'POST', body: JSON.stringify(body) }),

  forgotPassword: (email: string) =>
    request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resendVerification: (email: string) =>
    request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  me: (accessToken: string) =>
    request('/api/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } }),
};

// ─── Token helpers (localStorage) ────────────────────────────────────────────

export const tokenStore = {
  setTokens(access: string, refresh: string) {
    localStorage.setItem('hc_access', access);
    localStorage.setItem('hc_refresh', refresh);
  },
  getAccess: () => localStorage.getItem('hc_access'),
  getRefresh: () => localStorage.getItem('hc_refresh'),
  clear() {
    localStorage.removeItem('hc_access');
    localStorage.removeItem('hc_refresh');
  },
};
