'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AdminShell,
  StatCard,
  StatusBadge,
  SearchBar,
  ConfirmDialog,
  Toast,
  Pagination,
} from '@/components/admin-shell';
import { Star, MessageSquare, EyeOff, Flag, Trash2, Eye, Filter, RefreshCw } from 'lucide-react';


interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  practitioner: { id: string; name: string };
  session: { id: string };
}

interface ReviewStats {
  total: number;
  avgRating: number;
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return res.json();
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, avgRating: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; reviewId: string | null; action: 'delete' | null;
  }>({ open: false, reviewId: null, action: null });

  const perPage = 10;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<{ success: boolean; data?: { reviews: Review[] } }>('/api/admin/reviews');
      if (data.success && data.data) {
        const all = data.data.reviews;
        setReviews(all);
        const avg = all.length
          ? Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10
          : 0;
        setStats({ total: all.length, avgRating: avg });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const filtered = reviews.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.user.name?.toLowerCase().includes(q) ||
      r.user.email?.toLowerCase().includes(q) ||
      r.practitioner.name.toLowerCase().includes(q) ||
      r.comment?.toLowerCase().includes(q);
    const matchRating = ratingFilter === 'all' || r.rating.toString() === ratingFilter;
    return matchSearch && matchRating;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleDelete = (reviewId: string) => {
    setConfirmDialog({ open: true, reviewId, action: 'delete' });
  };

  const confirmDelete = async () => {
    const { reviewId } = confirmDialog;
    if (!reviewId) return;
    setConfirmDialog({ open: false, reviewId: null, action: null });
    try {
      await adminFetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setToast({ message: 'Review deleted', type: 'success' });
    } catch {
      setToast({ message: 'Failed to delete review', type: 'error' });
    }
  };

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-600'}`} />
    ));

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Monitor and moderate customer reviews</p>
          </div>
          <button
            onClick={fetchReviews}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-amber-600 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Reviews" value={loading ? '…' : stats.total} icon={MessageSquare} />
          <StatCard label="Average Rating" value={loading ? '…' : stats.avgRating.toFixed(1)} icon={Star} color="text-amber-500" />
          <StatCard label="5 Star Reviews" value={loading ? '…' : reviews.filter(r => r.rating === 5).length} icon={Star} color="text-green-500" />
          <StatCard label="1 Star Reviews" value={loading ? '…' : reviews.filter(r => r.rating === 1).length} icon={Flag} color="text-red-500" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by user, expert, or comment..." />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={ratingFilter}
                onChange={(e) => { setRatingFilter(e.target.value); setPage(1); }}
                className="block w-full sm:w-32 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User / Expert</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                      {reviews.length === 0 ? 'No reviews yet.' : 'No reviews match your filter.'}
                    </td>
                  </tr>
                ) : (
                  paginated.map((review) => (
                    <motion.tr key={review.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {review.user.name ?? review.user.email ?? 'Unknown user'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">to {review.practitioner.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                          <span className="text-xs text-gray-400 ml-1">{review.rating}/5</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-gray-700 dark:text-gray-300 truncate" title={review.comment ?? ''}>
                          {review.comment ?? <span className="text-gray-400 italic">No comment</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleDelete(review.id)} className="text-gray-400 hover:text-red-600" title="Delete Review">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination page={page} total={totalPages} perPage={perPage} onChange={setPage} />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title="Delete Review"
        message="Are you sure you want to delete this review? This cannot be undone."
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDialog({ open: false, reviewId: null, action: null })}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  );
}
