// API_URL is intentionally empty — all /api/* calls go through Next.js rewrite proxy
// which forwards to the backend (see next.config.mjs). This avoids CORS issues.
const API_URL = '';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  isSufficient?: boolean;
  errors?: { field: string; message: string }[];
}

interface AuthData {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  verifyMethod?: 'email' | 'sms';
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

export interface ConsultationSession {
  id: string;
  userId: string;
  practitionerId: string;
  type: string;
  status: 'INITIATED' | 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'WALLET_VERIFIED' | 'JOINING_CHANNEL' | 'ACTIVE' | 'ENDING' | 'ENDED' | 'BILLING_GENERATED' | 'RATING_PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'DISCONNECTED';
  channelName: string | null;
  agoraUid: number | null;
  perMinuteRate: number;
  walletDeduction: number;
  duration: number;
  startTime: string | null;
  endTime: string | null;
  totalCost: number;
  user: { id: string; name: string | null; photoUrl: string | null; email?: string | null; phone?: string | null };
  practitioner: { id: string; name: string; photoUrl: string | null; perMinuteRate: number; specialties?: string[] };
  review?: { id: string; rating: number; comment: string | null } | null;
}

export interface BillingSummaryData {
  consultationId: string;
  durationSeconds: number;
  durationFormatted: string;
  perMinuteRate: number;
  totalAmount: number;
  walletDeduction: number;
  remainingWalletBalance: number;
  startTime: string;
  endTime: string;
}

export interface AgoraData {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
}
async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<ApiResponse<T>> {
  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  const data = (await res.json()) as ApiResponse<T>;

  // Handle auto-token refresh on 401 or token expired error
  if (!res.ok && (res.status === 401 || data.message === 'Invalid or expired token') && !isRetry) {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('hc_refresh') : null;
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        const refreshData = (await refreshRes.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
        if (refreshData.success && refreshData.data) {
          localStorage.setItem('hc_access', refreshData.data.accessToken);
          localStorage.setItem('hc_refresh', refreshData.data.refreshToken);

          mergedHeaders['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
          return request<T>(path, { ...options, headers: mergedHeaders }, true);
        }
      } catch {
        localStorage.removeItem('hc_access');
        localStorage.removeItem('hc_refresh');
      }
    }
  }

  return data;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const authApi = {
  register: (body: {
    email: string; password: string; name: string;
    phone?: string; verifyMethod?: 'email' | 'sms';
  }) =>
    request<AuthData>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<AuthData>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  googleSignIn: (idToken: string) =>
    request<AuthData>('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),

  appleSignIn: (body: { appleId: string; email?: string; name?: string }) =>
    request<AuthData>('/api/auth/apple', { method: 'POST', body: JSON.stringify(body) }),

  forgotPassword: (email: string) =>
    request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),

  resendVerification: (email: string) =>
    request('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) }),

  sendOtp: (phone: string) =>
    request('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone: string, otp: string) =>
    request('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) }),

  resendOtp: (phone: string) =>
    request('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

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

export const consultationsApi = {
  start: (token: string, practitionerId: string, type: string = 'AUDIO') =>
    request<{ session: ConsultationSession }>('/api/consultations/start', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ practitionerId, type }),
    }),

  accept: (token: string, consultationId: string) =>
    request<{ session: ConsultationSession }>('/api/consultations/accept', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ consultationId }),
    }),

  reject: (token: string, consultationId: string) =>
    request<{ session: ConsultationSession }>('/api/consultations/reject', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ consultationId }),
    }),

  checkWallet: (token: string, consultationId: string) =>
    request<{ session: ConsultationSession; currentBalance?: number }>('/api/consultations/check-wallet', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ consultationId }),
    }),

  join: (token: string, consultationId: string) =>
    request<{ session: ConsultationSession; agora: AgoraData }>('/api/consultations/join', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ consultationId }),
    }),

  end: (token: string, consultationId: string) =>
    request<{ session: ConsultationSession; billingSummary: BillingSummaryData }>('/api/consultations/end', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ consultationId }),
    }),

  get: (token: string, id: string) =>
    request<{ session: ConsultationSession }>(`/api/consultations/${id}`, {
      headers: authHeader(token),
    }),

  rating: (token: string, body: { consultationId: string; rating: number; comment?: string }) =>
    request<{ session: ConsultationSession; review: unknown }>('/api/consultations/rating', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),
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
    
  rechargeStripe: (token: string, amount: number) =>
    request<{ url: string; sessionId: string }>('/api/wallet/recharge/stripe', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ amount }),
    }),
};

// ─── Token helpers (localStorage) ────────────────────────────────────────────

export const tokenStore = {
  setTokens(access: string, refresh: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hc_access', access);
      localStorage.setItem('hc_refresh', refresh);
    }
  },
  getAccess: () => (typeof window !== 'undefined' ? localStorage.getItem('hc_access') : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem('hc_refresh') : null),
  clear() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hc_access');
      localStorage.removeItem('hc_refresh');
    }
  },
};
