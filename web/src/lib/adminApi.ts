/**
 * adminApi.ts — Admin Panel API client
 *
 * All requests go through the Next.js proxy rewrite (/api/* → backend:8082/api/*).
 * The x-admin-key header is set from NEXT_PUBLIC_ADMIN_KEY env var (or default for local dev).
 * In production, set NEXT_PUBLIC_ADMIN_KEY in the deployment environment.
 */

const ADMIN_KEY =
  process.env['NEXT_PUBLIC_ADMIN_KEY'] ?? 'healconnect-admin-2026';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY,
      ...options.headers,
    },
  });
  return res.json() as Promise<ApiResponse<T>>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalPractitioners: number;
  activeSessions: number;
  pendingKyc: number;
  verifiedPractitioners: number;
  totalSessions: number;
  totalRevenue: number;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  provider: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  isBanned?: boolean;
  banReason?: string | null;
  banUntil?: string | null;
}

export interface AdminPractitioner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  languages: string[];
  experienceYrs: number;
  perMinuteRate: number;
  photoUrl: string | null;
  isVerified: boolean;
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  avgRating: number | null;
  isBanned?: boolean;
  banReason?: string | null;
  banUntil?: string | null;
}

export interface AdminSession {
  id: string;
  type: string;
  status: string;
  duration: number;
  totalCost: number;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  practitioner: { id: string; name: string };
}

export interface AdminPayout {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  perMinuteRate: number;
  isVerified: boolean;
  completedSessionCount: number;
  totalEarned: number;
}

export interface AdminAnalytics {
  sessionsByType: { CHAT: number; AUDIO: number; VIDEO: number };
  revenueByDay: { date: string; revenue: number }[];
  topPractitioners: { id: string; name: string; totalEarned: number }[];
  userGrowth: { date: string; count: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

export const adminApi = {
  // Dashboard
  getStats: () =>
    adminFetch<AdminStats>('/api/admin/stats'),

  // Users
  getUsers: (params: { search?: string; status?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return adminFetch<{ users: AdminUser[]; pagination: Pagination }>(
      `/api/admin/users?${q.toString()}`
    );
  },

  getUser: (id: string) =>
    adminFetch<{ user: AdminUser; sessionCount: number; wallet: { balance: number; currency: string } }>(
      `/api/admin/users/${id}`
    ),

  deleteUser: (id: string) =>
    adminFetch(`/api/admin/users/${id}`, { method: 'DELETE' }),

  // Practitioners
  getPractitioners: (params: { search?: string; kycStatus?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.kycStatus) q.set('kycStatus', params.kycStatus);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return adminFetch<{ practitioners: AdminPractitioner[]; pagination: Pagination }>(
      `/api/admin/practitioners?${q.toString()}`
    );
  },

  getPractitioner: (id: string) =>
    adminFetch<{ practitioner: AdminPractitioner & { sessions: AdminSession[]; reviews: unknown[] } }>(
      `/api/admin/practitioners/${id}`
    ),

  verifyPractitioner: (id: string, isVerified: boolean) =>
    adminFetch(`/api/admin/practitioners/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ isVerified }),
    }),

  updatePractitionerRate: (id: string, perMinuteRate: number) =>
    adminFetch(`/api/admin/practitioners/${id}/rate`, {
      method: 'PATCH',
      body: JSON.stringify({ perMinuteRate }),
    }),

  deletePractitioner: (id: string) =>
    adminFetch(`/api/admin/practitioners/${id}`, { method: 'DELETE' }),

  // Sessions
  getSessions: (params: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    return adminFetch<{ sessions: AdminSession[]; pagination: Pagination }>(
      `/api/admin/sessions?${q.toString()}`
    );
  },

  getSession: (id: string) =>
    adminFetch<{ session: AdminSession & { review: unknown; _count: { messages: number } } }>(
      `/api/admin/sessions/${id}`
    ),

  // Payouts
  getPayouts: () =>
    adminFetch<{ payouts: AdminPayout[] }>('/api/admin/payouts'),

  // Analytics
  getAnalytics: () =>
    adminFetch<AdminAnalytics>('/api/admin/analytics'),
};

// ─── Support Tickets ────────────────────────────────────────────────────────

export interface AdminTicketMessage {
  id: string;
  senderType: 'USER' | 'PRACTITIONER' | 'ADMIN';
  message: string;
  createdAt: string;
}

export interface AdminTicket {
  id: string;
  subject: string;
  category: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
  practitioner: { id: string; name: string; email: string | null } | null;
  _count?: { messages: number };
  messages?: AdminTicketMessage[];
}

export const ticketsApi = {
  list: (status?: string, page = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set('status', status);
    return adminFetch<{ tickets: AdminTicket[]; pagination: Pagination }>(
      `/api/admin/tickets?${params.toString()}`
    );
  },

  get: (id: string) =>
    adminFetch<{ ticket: AdminTicket }>(`/api/admin/tickets/${id}`),

  reply: (id: string, message: string, status?: string) =>
    adminFetch<{ message: AdminTicketMessage | null; status: string }>(
      `/api/admin/tickets/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ message, status }) }
    ),
};

// ─── Moderation: Ban / Suspend ───────────────────────────────────────────────

export interface BanResult {
  id: string;
  name: string | null;
  email: string | null;
  isBanned: boolean;
  banReason: string | null;
  banUntil: string | null;
}

export const banApi = {
  banUser: (id: string, days: number | null, reason?: string) =>
    adminFetch<{ user: BanResult }>(`/api/admin/users/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ banned: true, days: days ?? undefined, reason }),
    }),

  unbanUser: (id: string) =>
    adminFetch<{ user: BanResult }>(`/api/admin/users/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ banned: false }),
    }),

  banPractitioner: (id: string, days: number | null, reason?: string) =>
    adminFetch<{ practitioner: BanResult }>(`/api/admin/practitioners/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ banned: true, days: days ?? undefined, reason }),
    }),

  unbanPractitioner: (id: string) =>
    adminFetch<{ practitioner: BanResult }>(`/api/admin/practitioners/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ banned: false }),
    }),
};
