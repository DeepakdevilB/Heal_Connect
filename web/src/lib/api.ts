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

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  dob: string | null;
  birthPlace: string | null;
  gender: string | null;
  wellnessInterests: string[];
  photoUrl: string | null;
  isEmailVerified: boolean;
}

export interface PractitionerProfile {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  languages: string[];
  experienceYrs: number;
  perMinuteRate: number;
  photoUrl: string | null;
  isVerified: boolean;
  isOnline: boolean;
  avgRating?: number;
  reviewCount?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json() as ApiResponse<T>;
  return data;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
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
    request('/api/auth/me', { headers: authHeader(accessToken) }),
};

export const usersApi = {
  getProfile: (token: string) =>
    request<{ user: UserProfile }>('/api/users/me', { headers: authHeader(token) }),

  updateProfile: (token: string, body: Partial<Omit<UserProfile, 'id' | 'email' | 'isEmailVerified' | 'photoUrl'>>) =>
    request<{ user: UserProfile }>('/api/users/me', {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  uploadPhoto: (token: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return fetch(`${API_URL}/api/users/me/photo`, {
      method: 'POST',
      headers: authHeader(token),
      body: form,
    }).then((r) => r.json() as Promise<ApiResponse<{ photoUrl: string }>>);
  },

  deletePhoto: (token: string) =>
    request('/api/users/me/photo', { method: 'DELETE', headers: authHeader(token) }),

  deleteAccount: (token: string) =>
    request('/api/users/me', { method: 'DELETE', headers: authHeader(token) }),
};

export const practitionersApi = {
  list: (params: {
    search?: string; specialty?: string; language?: string;
    minRating?: string; maxRate?: string; onlineOnly?: boolean;
    page?: number; limit?: number;
  } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    return fetch(`${API_URL}/api/practitioners?${q}`).then((r) => r.json() as Promise<ApiResponse<{
      practitioners: PractitionerProfile[];
      pagination: { total: number; page: number; limit: number; pages: number };
    }>>);
  },

  get: (id: string) =>
    request<{ practitioner: PractitionerProfile }>(`/api/practitioners/${id}`),

  create: (token: string, body: Partial<PractitionerProfile> & { name: string }) =>
    request<{ practitioner: PractitionerProfile }>('/api/practitioners', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  update: (token: string, id: string, body: Partial<PractitionerProfile>) =>
    request<{ practitioner: PractitionerProfile }>(`/api/practitioners/${id}`, {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  uploadPhoto: (token: string, id: string, file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return fetch(`${API_URL}/api/practitioners/${id}/photo`, {
      method: 'POST',
      headers: authHeader(token),
      body: form,
    }).then((r) => r.json() as Promise<ApiResponse<{ photoUrl: string }>>);
  },

  setAvailability: (token: string, id: string, isOnline: boolean) =>
    request(`/api/practitioners/${id}/availability`, {
      method: 'PATCH',
      headers: authHeader(token),
      body: JSON.stringify({ isOnline }),
    }),

  delete: (token: string, id: string) =>
    request(`/api/practitioners/${id}`, { method: 'DELETE', headers: authHeader(token) }),
};

export const walletApi = {
  getBalance: (token: string) =>
    request<{ wallet: { id: string; balance: number; currency: string; transactions: { id: string; type: string; status: string; amount: number; createdAt: string }[] } }>('/api/wallet', {
      headers: authHeader(token),
    }),

  recharge: (token: string, amount: number) =>
    request<{ orderId: string; amount: number; currency: string; transactionId: string }>('/api/wallet/recharge', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ amount }),
    }),
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
