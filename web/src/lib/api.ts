// API_URL is intentionally empty — all /api/* calls go through Next.js rewrite proxy
// which forwards to the backend (see next.config.mjs). This avoids CORS issues.
const API_URL = '';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
  code?: string;
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

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
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
  email?: string | null;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  languages: string[];
  experienceYrs: number;
  perMinuteRate: number;
  photoUrl: string | null;
  isVerified: boolean;
  isOnline: boolean;
  isBusy?: boolean;
  avgRating?: number;
  reviewCount?: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  // Extract headers from options so they don't overwrite the merged headers
  const { headers, ...restOptions } = options;
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
    ...restOptions,
  });
  const data = await res.json() as ApiResponse<T>;
  return data;
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const authApi = {
  register: (body: {
    email: string; password: string; name: string; dob: string;
    phone?: string; verifyMethod?: 'email' | 'sms';
    acceptTerms: boolean; acceptPrivacy: boolean; emailMarketingOptIn?: boolean;
  }) =>
    request<AuthData>('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<AuthData>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  googleSignIn: (idToken: string, state?: string) =>
    request<AuthData>('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken, state }) }),

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

  practitionerLogin: (email: string, password: string) =>
    request<{ practitioner: { id: string; name: string; email: string | null; isVerified: boolean }; accessToken: string; refreshToken: string; role: string }>(
      '/api/auth/practitioner/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  practitionerRegister: (
    name: string,
    email: string,
    password: string,
    dob: string,
    consent: { acceptTerms: boolean; acceptPrivacy: boolean; emailMarketingOptIn?: boolean }
  ) =>
    request<{ practitioner: { id: string; name: string; email: string | null; isVerified: boolean }; accessToken: string; refreshToken: string; role: string }>(
      '/api/auth/practitioner/register',
      { method: 'POST', body: JSON.stringify({ name, email, password, dob, ...consent }) }
    ),

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

  exportData: (token: string) =>
    request('/api/users/me/export', { method: 'POST', headers: authHeader(token) }),
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

  deleteAccount: (token: string) =>
    request('/api/practitioners/me', { method: 'DELETE', headers: authHeader(token) }),

  exportData: (token: string) =>
    request('/api/practitioners/me/export', { method: 'POST', headers: authHeader(token) }),
};

export const sessionsApi = {
  create: (token: string, practitionerId: string, type: 'CHAT' | 'AUDIO' | 'VIDEO') =>
    request<{ session: { id: string; status: string; type: string } }>('/api/sessions', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ practitionerId, type }),
    }),

  get: (token: string, sessionId: string) =>
    request<{ session: { id: string; status: string; type: string; practitionerId?: string; practitioner: PractitionerProfile; userId?: string; user?: any } }>(
      `/api/sessions/${sessionId}`,
      { headers: authHeader(token) }
    ),

  end: (token: string, sessionId: string) =>
    request(`/api/sessions/${sessionId}/end`, { method: 'POST', headers: authHeader(token) }),

  connect: (token: string, sessionId: string) =>
    request<{ session: any }>(`/api/sessions/${sessionId}/connect`, { method: 'POST', headers: authHeader(token) }),

  requestSession: (token: string, practitionerId: string, type?: string) =>
    request<{ session: any }>('/api/sessions/request', { method: 'POST', headers: authHeader(token), body: JSON.stringify({ practitionerId, type }) }),

  getRequests: (token: string) =>
    request<{ sessions: any[] }>('/api/sessions/requests', { headers: authHeader(token) }),

  selectTime: (token: string, requestId: string, time: string) =>
    request(`/api/sessions/requests/${requestId}/select-time`, { method: 'POST', headers: authHeader(token), body: JSON.stringify({ time }) }),

  accept: (token: string, requestId: string) =>
    request(`/api/sessions/requests/${requestId}/accept`, { method: 'POST', headers: authHeader(token) }),

  proposeTimes: (token: string, requestId: string, times: { startTime: string; endTime: string }[]) =>
    request(`/api/sessions/requests/${requestId}/propose-times`, { method: 'POST', headers: authHeader(token), body: JSON.stringify({ times }) }),

  practitionerActive: (token: string) =>
    request<{ sessions: { id: string; type: string; status: string; createdAt: string; user: { id: string; name: string | null; photoUrl: string | null } }[] }>(
      '/api/sessions/practitioner/active',
      { headers: authHeader(token) }
    ),

  practitionerHistory: (token: string) =>
    request<{ sessions: { id: string; type: string; totalCost: number; startTime: string | null; endTime: string | null; user: { id: string; name: string | null; photoUrl: string | null } }[]; totalEarnings: number; totalSessionsCompleted: number }>(
      '/api/sessions/practitioner/history',
      { headers: authHeader(token) }
    ),

  userHistory: (token: string) =>
    request<{ sessions: { id: string; type: string; totalCost: number; startTime: string | null; endTime: string | null; practitioner: { id: string; name: string; photoUrl: string | null; specialties: string[] } }[]; totalSpent: number; totalMinutes: number; totalSessionsCompleted: number }>(
      '/api/sessions/user/history',
      { headers: authHeader(token) }
    ),

  myTranscripts: (token: string, page?: number) =>
    request<{ transcripts: TranscriptEntry[]; pagination: Pagination }>('/api/sessions/transcripts' + (page ? `?page=${page}` : ''), { headers: authHeader(token) }),

  practitionerTranscripts: (token: string, page?: number) =>
    request<{ transcripts: TranscriptEntry[]; pagination: Pagination }>('/api/sessions/practitioner/transcripts' + (page ? `?page=${page}` : ''), { headers: authHeader(token) }),
};

export interface TranscriptEntry {
  id: string;
  sessionId: string;
  type: string;
  startTime: string;
  endTime: string;
  submittedAt: string;
  transcriptText?: string;
  recordingUrl?: string;
  session: any;
  practitioner?: { name: string; photoUrl: string | null };
  user?: { name: string; photoUrl: string | null };
}


export const agoraApi = {
  getToken: (token: string, sessionId: string) =>
    request<{ token: string; channelName: string; uid: number; appId: string; expireTs: number }>(
      '/api/agora/token',
      { method: 'POST', headers: authHeader(token), body: JSON.stringify({ sessionId }) }
    ),

  getChannel: (token: string, sessionId: string) =>
    request<{ appId: string; channelName: string; sessionStatus: string; sessionType: string }>(
      `/api/agora/channel/${sessionId}`,
      { headers: authHeader(token) }
    ),

  submitFeedback: (token: string, body: {
    sessionId: string; audioQuality: number; overallRating: number;
    issues?: string[]; comment?: string;
  }) =>
    request('/api/agora/feedback', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),
};

export const deepgramApi = {
  getToken: (token: string, sessionId: string) =>
    request<{ apiKey?: string; isConfigured: boolean; isEphemeral?: boolean }>('/api/deepgram/token', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ sessionId }),
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

// ─── Astrologer Auth API ──────────────────────────────────────────────────────

export interface AstrologerAuthData {
  accessToken: string;
  refreshToken: string;
  astrologer: {
    id: string;
    userId: string;
    phone: string | null;
    applicationStatus: string;
    accountStatus: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    identityVerified: boolean;
    professionalVerified: boolean;
    adminVerified: boolean;
    displayName: string | null;
  };
  redirect: string;
}

export const astrologerAuthApi = {
  sendOtp: (phone: string, purpose: 'login' | 'register' = 'login') =>
    request('/api/auth/astrologer/send-otp', { method: 'POST', body: JSON.stringify({ phone, purpose }) }),

  verifyOtp: (phone: string, otp: string, purpose: 'login' | 'register' = 'login') =>
    request<AstrologerAuthData>('/api/auth/astrologer/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp, purpose }) }),

  register: (name: string, email: string, password: string) =>
    request<AstrologerAuthData>('/api/auth/astrologer/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  loginEmail: (email: string, password: string) =>
    request<AstrologerAuthData>('/api/auth/astrologer/login-email', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: (accessToken: string, refreshToken?: string) =>
    request('/api/auth/astrologer/logout', {
      method: 'POST',
      headers: authHeader(accessToken),
      body: JSON.stringify({ refreshToken }),
    }),
};

// ─── Astrologer Profile API ───────────────────────────────────────────────────

export interface AstrologerOnboardingProfile {
  id: string;
  userId: string;
  fullLegalName: string;
  displayName: string;
  email?: string | null;
  name?: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  profilePhotoUrl: string | null;
  country: string;
  state: string | null;
  city: string | null;
  specializations: string[];
  languages: string[];
  astrologyExperienceYears: number;
  professionalConsultationYears: number;
  previousPlatformExperience: string | null;
  professionalBio: string | null;
  consultationApproach: string | null;
  completedAstrologyCourse: boolean;
  instituteName: string | null;
  courseName: string | null;
  completionYear: number | null;
  chatPricePerMin: number;
  callPricePerMin: number;
  applicationStatus: string;
  accountStatus: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  identityVerified: boolean;
  professionalVerified: boolean;
  adminVerified: boolean;
  application?: { step: number; submittedAt: string | null; lastSavedAt: string };
  isOnline?: boolean;
  avgRating?: number;
  reviewCount?: number;
  totalConsultations?: number;
  totalEarnings?: number;
}

export const astrologerApi = {
  getApplication: (token: string) =>
    request<{ profile: AstrologerOnboardingProfile }>('/api/astrologers/application/me', { headers: authHeader(token) }),

  createApplication: (token: string, body: Partial<AstrologerOnboardingProfile>) =>
    request<{ profile: AstrologerOnboardingProfile }>('/api/astrologers/application', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  updateApplication: (token: string, body: Partial<AstrologerOnboardingProfile> & { step?: number }) =>
    request<{ profile: AstrologerOnboardingProfile }>('/api/astrologers/application/me', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  getMe: (token: string) =>
    request<{ profile: AstrologerOnboardingProfile }>('/api/astrologers/me', { headers: authHeader(token) }),

  updateProfile: (token: string, body: Partial<AstrologerOnboardingProfile>) =>
    request<{ profile: AstrologerOnboardingProfile }>('/api/astrologers/me/profile', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  uploadDocument: (token: string, file: File, documentType: string) => {
    const form = new FormData();
    form.append('document', file);
    form.append('documentType', documentType);
    return fetch('/api/astrologers/me/documents', {
      method: 'POST',
      headers: authHeader(token),
      body: form,
    }).then((r) => r.json() as Promise<ApiResponse<{ document: { id: string; documentType: string; originalName: string; uploadedAt: string; url?: string } }>>);
  },

  getDocuments: (token: string) =>
    request<{ documents: { id: string; documentType: string; originalName: string; mimeType: string; sizeBytes: number; isPrivate: boolean; uploadedAt: string }[] }>(
      '/api/astrologers/me/documents', { headers: authHeader(token) }
    ),

  deleteDocument: (token: string, id: string) =>
    request(`/api/astrologers/me/documents/${id}`, { method: 'DELETE', headers: authHeader(token) }),

  submitVerification: (token: string, body: {
    idDocType?: string; panLast4?: string;
    verificationType?: string; platformProfileUrl?: string;
    professionalWebsite?: string; verificationNotes?: string;
  }) =>
    request('/api/astrologers/me/verification/submit', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  getVerificationStatus: (token: string) =>
    request<{ verification: AstrologerOnboardingProfile & { kycVerification: any; professionalVerification: any; interviewVerification: any } }>(
      '/api/astrologers/me/verification/status', { headers: authHeader(token) }
    ),

  updatePricing: (token: string, chatPricePerMin: number, callPricePerMin: number) =>
    request('/api/astrologers/me/pricing', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify({ chatPricePerMin, callPricePerMin }),
    }),

  updateAvailability: (token: string, body: { isOnline?: boolean; isChatAvailable?: boolean; isCallAvailable?: boolean }) =>
    request('/api/astrologers/me/availability', {
      method: 'PUT',
      headers: authHeader(token),
      body: JSON.stringify(body),
    }),

  getDashboard: (token: string) =>
    request<{ dashboard: AstrologerOnboardingProfile }>('/api/astrologers/me/dashboard', { headers: authHeader(token) }),

  listPublic: (params: { search?: string; specialization?: string; language?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    return fetch(`/api/astrologers/public?${q}`).then((r) => r.json() as Promise<ApiResponse<{ astrologers: any[]; pagination: Pagination }>>);
  },

  getPublic: (id: string) =>
    request<{ astrologer: any }>(`/api/astrologers/public/${id}`),
};

// ─── Admin Astrologer API ─────────────────────────────────────────────────────

export const adminAstrologerApi = {
  list: (adminKey: string, params: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, String(v)); });
    return request<{ astrologers: any[]; pagination: Pagination }>(`/api/admin/astrologers?${q}`, {
      headers: { 'x-admin-key': adminKey },
    });
  },

  get: (adminKey: string, id: string) =>
    request<{ profile: any; liveEligible: boolean }>(`/api/admin/astrologers/${id}`, {
      headers: { 'x-admin-key': adminKey },
    }),

  approve: (adminKey: string, id: string, notes?: string) =>
    request(`/api/admin/astrologers/${id}/approve`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: JSON.stringify({ notes }),
    }),

  reject: (adminKey: string, id: string, reason: string, notes?: string) =>
    request(`/api/admin/astrologers/${id}/reject`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: JSON.stringify({ reason, notes }),
    }),

  requestInfo: (adminKey: string, id: string, notes: string) =>
    request(`/api/admin/astrologers/${id}/request-information`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: JSON.stringify({ notes }),
    }),

  suspend: (adminKey: string, id: string, reason: string, notes?: string) =>
    request(`/api/admin/astrologers/${id}/suspend`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: JSON.stringify({ reason, notes }),
    }),

  block: (adminKey: string, id: string, reason: string, notes?: string) =>
    request(`/api/admin/astrologers/${id}/block`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
      body: JSON.stringify({ reason, notes }),
    }),
};

export const astrologerTokenStore = {
  setTokens(access: string, refresh: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hca_access', access);
      localStorage.setItem('hca_refresh', refresh);
    }
  },
  getAccess: () => (typeof window !== 'undefined' ? localStorage.getItem('hca_access') : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem('hca_refresh') : null),
  setProfile(profile: AstrologerAuthData['astrologer']) {
    if (typeof window !== 'undefined') localStorage.setItem('hca_profile', JSON.stringify(profile));
  },
  getProfile(): AstrologerAuthData['astrologer'] | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('hca_profile');
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hca_access');
      localStorage.removeItem('hca_refresh');
      localStorage.removeItem('hca_profile');
    }
  },
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hc_access');
      localStorage.removeItem('hc_refresh');
    }
  },
};


// ─── GDPR: Consent ────────────────────────────────────────────────────────────

export type ConsentCategory =
  | 'TERMS'
  | 'PRIVACY_NOTICE'
  | 'SENSITIVE_DATA'
  | 'ANALYTICS'
  | 'EMAIL_MARKETING'
  | 'SMS_MARKETING'
  | 'PUSH_MARKETING';
export type ConsentState = Partial<
  Record<ConsentCategory, { granted: boolean; updatedAt: string; policyVersion: string | null }>
>;

/** First-party random id used to track consent for visitors who aren't logged in yet. */
export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('hc_visitor_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('hc_visitor_id', id);
  }
  return id;
}

export const consentApi = {
  get: () => {
    const token = tokenStore.getAccess();
    const q = token ? '' : `?visitorId=${encodeURIComponent(getVisitorId())}`;
    return request<{ consent: ConsentState }>(`/api/consent${q}`, token ? { headers: authHeader(token) } : {});
  },

  record: (category: ConsentCategory, granted: boolean) => {
    const token = tokenStore.getAccess();
    return request('/api/consent', {
      method: 'POST',
      headers: token ? authHeader(token) : {},
      body: JSON.stringify(token ? { category, granted } : { category, granted, visitorId: getVisitorId() }),
    });
  },
};

export interface TicketMessageEntry {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string;
  senderType?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicketEntry {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: TicketMessageEntry[];
}

export const ticketsApi = {
  create: (token: string, subject: string, message: string, category?: string) =>
    request<{ ticket: SupportTicketEntry }>('/api/tickets', {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ subject, message, category }),
    }),

  list: (token: string) =>
    request<{ tickets: SupportTicketEntry[] }>('/api/tickets', {
      headers: authHeader(token),
    }),

  mine: (token: string) =>
    request<{ tickets: SupportTicketEntry[] }>('/api/tickets/mine', {
      headers: authHeader(token),
    }),

  get: (token: string, id: string) =>
    request<{ ticket: SupportTicketEntry }>(`/api/tickets/${id}`, {
      headers: authHeader(token),
    }),

  reply: (token: string, id: string, message: string) =>
    request<{ message: TicketMessageEntry }>(`/api/tickets/${id}/reply`, {
      method: 'POST',
      headers: authHeader(token),
      body: JSON.stringify({ message }),
    }),

  close: (token: string, id: string) =>
    request<{ ticket: SupportTicketEntry }>(`/api/tickets/${id}/close`, {
      method: 'POST',
      headers: authHeader(token),
    }),
};
