'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, StarHalf, Sparkles, User, Edit2, Trash2, Plus, X,
  ChevronDown, MessageSquare, ThumbsUp, Filter, Search,
  Check, Clock, ArrowUp, ArrowDown, SlidersHorizontal,
  Heart
} from 'lucide-react';
import Navbar from '@/components/navbar';

// --- TYPES ---
interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  body: string;
  astrologerName?: string;
  date: string;
  likes: number;
  liked: boolean;
  verified: boolean;
}

// --- MOCK CURRENT USER ---
const MOCK_USER = { id: 'current-user', name: 'You (Logged In)' };

// --- INITIAL MOCK REVIEWS ---
const INITIAL_REVIEWS: Review[] = [
  {
    id: 'r1', userId: 'u1', userName: 'Priya Sharma',
    rating: 5, title: 'Life-changing consultation!',
    body: 'My session with Pandit Rameshwar was absolutely transformative. He accurately predicted major events in my career and gave actionable remedies that have genuinely worked. His insights on my Lagna chart were spot-on, and his calm demeanor made me feel at ease throughout the session. I have already referred three friends to HealConnect!',
    astrologerName: 'Pandit Rameshwar', date: '2026-07-20', likes: 24, liked: false, verified: true
  },
  {
    id: 'r2', userId: 'u2', userName: 'Rohit Mehra',
    rating: 4, title: 'Very accurate horoscope reading',
    body: 'Jyotishi Anand predicted my job transition almost to the month. He explained the Saturn transit in a way I could understand even as a beginner. The session ran a few minutes shorter than expected, but overall the experience was excellent. Would definitely book again for my annual Kundli review.',
    astrologerName: 'Jyotishi Anand', date: '2026-07-15', likes: 18, liked: false, verified: true
  },
  {
    id: 'r3', userId: 'u3', userName: 'Ananya Bose',
    rating: 5, title: 'Best astrology platform!',
    body: 'HealConnect has the most genuine astrologers I have encountered online. The Kundli generator is incredibly detailed — showing Vimshottari Dasha, Navamsa, and Yogas all in one place. The blog articles are also super educational. I have been using this platform for 3 months and it keeps getting better!',
    date: '2026-07-10', likes: 31, liked: false, verified: true
  },
  {
    id: 'r4', userId: 'u4', userName: 'Karan Patel',
    rating: 3, title: 'Good but can improve',
    body: 'The platform is solid and the astrologers are genuine, but I had to wait almost 15 minutes before my session started. The Kundli report was thorough though — appreciated the Dosha analysis section. Would love to see a feature for comparing two Kundlis (Kundli Milan). The UI is beautiful and easy to use.',
    astrologerName: 'Dr. Meena Joshi', date: '2026-07-05', likes: 7, liked: false, verified: false
  },
  {
    id: 'r5', userId: 'u5', userName: 'Sunita Reddy',
    rating: 5, title: 'Highly recommend Pandit Vikram!',
    body: 'Pandit Vikram is a true master. He identified my Kaal Sarp Dosha without me even mentioning it and prescribed powerful yet simple remedies. His knowledge of Nakshatras is unparalleled. I felt deeply understood during the session. The video call quality was crystal clear. Best ₹500 I have spent in a long time!',
    astrologerName: 'Pandit Vikram', date: '2026-06-28', likes: 42, liked: false, verified: true
  },
  {
    id: 'r6', userId: 'u6', userName: 'Deepak Joshi',
    rating: 4, title: 'Excellent Numerology session',
    body: 'I was skeptical at first, but the numerology reading I received was remarkably accurate. The astrologer explained how my life path number influences my relationships and career. I was given a detailed report at the end of the session. The wallet system is also very transparent — no hidden charges. Recommend to anyone curious about Vedic sciences.',
    astrologerName: 'Astro Priya', date: '2026-06-20', likes: 15, liked: false, verified: true
  },
  {
    id: 'r7', userId: 'u7', userName: 'Nidhi Verma',
    rating: 2, title: 'Mixed experience',
    body: 'The platform itself is beautifully designed and the Kundli tool is impressive. However, the astrologer I connected with seemed distracted and gave generic advice. I expected more personalized insights based on my birth chart. Customer support was helpful when I raised my concern and offered a partial refund. Hoping for better next time.',
    date: '2026-06-12', likes: 3, liked: false, verified: false
  },
  {
    id: 'r8', userId: 'u8', userName: 'Amit Kulkarni',
    rating: 5, title: 'Outstanding experience overall',
    body: 'From the moment I landed on HealConnect, the design and energy of the platform felt different from typical astrology sites. The free Kundli tool is fantastic, and the blog has some of the most well-researched astrology content I have read. My paid consultation with Pandit Gurudev was worth every rupee — his predictions about my family situation were eerily accurate!',
    astrologerName: 'Pandit Gurudev', date: '2026-06-05', likes: 37, liked: false, verified: true
  },
];

// --- STAR RENDER HELPER ---
function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${cls} ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'}`}
        />
      ))}
    </div>
  );
}

// --- INTERACTIVE STAR PICKER ---
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-125"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              i <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 fill-gray-100'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// --- AVATAR HELPER ---
function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11 text-sm';
  const colors = ['from-amber-400 to-orange-500', 'from-purple-400 to-pink-500', 'from-blue-400 to-cyan-500', 'from-green-400 to-teal-500'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  if (photoUrl) return <img src={photoUrl} alt={name} className={`${sizeClass} rounded-full object-cover border-2 border-amber-200`} />;
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center font-extrabold text-white border-2 border-amber-200 shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// --- RATING BAR ---
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-gray-600 w-3">{star}</span>
      <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
        />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
    </div>
  );
}

// --- MAIN PAGE ---
export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [sortBy, setSortBy] = useState<'latest' | 'highest' | 'lowest'>('latest');
  const [filterStar, setFilterStar] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formAstrologer, setFormAstrologer] = useState('');
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // --- COMPUTED ---
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ star: s, count: reviews.filter((r) => r.rating === s).length }));

  const filtered = reviews
    .filter((r) => filterStar === null || r.rating === filterStar)
    .filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return r.userName.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q) || (r.astrologerName || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  // --- FORM HANDLERS ---
  const openAdd = () => {
    setEditingId(null);
    setFormRating(0); setFormTitle(''); setFormBody(''); setFormAstrologer('');
    setFormError(''); setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const openEdit = (r: Review) => {
    setEditingId(r.id);
    setFormRating(r.rating); setFormTitle(r.title); setFormBody(r.body); setFormAstrologer(r.astrologerName || '');
    setFormError(''); setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formRating === 0) { setFormError('Please select a star rating.'); return; }
    if (!formTitle.trim()) { setFormError('Please enter a review title.'); return; }
    if (formBody.trim().length < 20) { setFormError('Review message must be at least 20 characters.'); return; }

    if (editingId) {
      setReviews((prev) => prev.map((r) =>
        r.id === editingId
          ? { ...r, rating: formRating, title: formTitle.trim(), body: formBody.trim(), astrologerName: formAstrologer.trim() || undefined }
          : r
      ));
    } else {
      const newReview: Review = {
        id: `r${Date.now()}`, userId: MOCK_USER.id, userName: MOCK_USER.name,
        rating: formRating, title: formTitle.trim(), body: formBody.trim(),
        astrologerName: formAstrologer.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        likes: 0, liked: false, verified: false
      };
      setReviews((prev) => [newReview, ...prev]);
    }
    setShowForm(false); setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    setDeleteConfirm(null);
  };

  const toggleLike = (id: string) => {
    setReviews((prev) => prev.map((r) =>
      r.id === id ? { ...r, liked: !r.liked, likes: r.liked ? r.likes - 1 : r.likes + 1 } : r
    ));
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const SORT_OPTIONS = [
    { val: 'latest' as const, label: 'Latest', icon: Clock },
    { val: 'highest' as const, label: 'Highest Rating', icon: ArrowDown },
    { val: 'lowest' as const, label: 'Lowest Rating', icon: ArrowUp },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <Navbar />

      {/* ── HERO HEADER ── */}
      <section className="pt-28 pb-12 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl" />
        </div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-200 text-amber-700 text-xs font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Community Reviews
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
            What Our Community<br />
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Is Saying</span>
          </h1>
          <p className="text-gray-600 text-lg font-medium max-w-xl mx-auto">
            Real experiences from real people. Discover why thousands trust HealConnect for their spiritual journey.
          </p>
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pb-20">

        {/* ── STATS + SUMMARY GRID ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mb-10"
        >
          {/* Overall Score */}
          <div className="md:col-span-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-6 text-white shadow-xl shadow-amber-200/50 flex flex-col items-center justify-center text-center">
            <p className="text-white/80 text-sm font-bold uppercase tracking-wider mb-1">Overall Rating</p>
            <p className="text-7xl font-black leading-none mb-2">{avg.toFixed(1)}</p>
            <StarDisplay rating={Math.round(avg)} size="md" />
            <p className="mt-3 text-white/80 text-sm font-semibold">{total} verified reviews</p>
          </div>

          {/* Distribution */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-amber-100">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-500 mb-4">Rating Distribution</h3>
            <div className="space-y-3">
              {dist.map(({ star, count }) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFilterStar(filterStar === star ? null : star)}
                  className={`w-full flex items-center gap-2 rounded-xl px-2 py-1 transition-all ${filterStar === star ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                >
                  <RatingBar star={star} count={count} total={total} />
                  {filterStar === star && <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 font-medium">Click a row to filter reviews by that rating</p>
          </div>
        </motion.div>

        {/* ── QUICK STATS STRIP ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Reviews', val: total, icon: MessageSquare },
            { label: 'Average Rating', val: `${avg.toFixed(2)} ★`, icon: Star },
            { label: '5-Star Reviews', val: dist[0].count, icon: Heart },
          ].map(({ label, val, icon: Icon }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 text-center"
            >
              <Icon className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xl font-black text-gray-900">{val}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </motion.div>
          ))}
        </div>

        {/* ── WRITE A REVIEW CTA ── */}
        {!showForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <button
              onClick={openAdd}
              className="flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold px-7 py-3.5 rounded-2xl shadow-lg shadow-amber-200/60 transition-all hover:scale-105 hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Write a Review
            </button>
          </motion.div>
        )}

        {/* ── REVIEW FORM ── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              ref={formRef}
              key="review-form"
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              className="bg-white rounded-3xl border border-amber-200 shadow-xl shadow-amber-100/40 p-6 mb-10"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center">
                    <Edit2 className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-gray-900">{editingId ? 'Edit Your Review' : 'Write a Review'}</h2>
                    <p className="text-xs text-gray-500">Share your experience with our community</p>
                  </div>
                </div>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Star Rating */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2">Your Rating *</label>
                  <StarPicker value={formRating} onChange={setFormRating} />
                  {formRating > 0 && (
                    <p className="text-xs text-amber-600 font-semibold mt-1">
                      {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][formRating]}
                    </p>
                  )}
                </div>

                {/* Review Title */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Review Title *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Summarise your experience..."
                    maxLength={80}
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
                  />
                </div>

                {/* Review Message */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Your Review *</label>
                  <textarea
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    placeholder="Describe your experience in detail... (min 20 characters)"
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{formBody.length}/500</p>
                </div>

                {/* Astrologer Name */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Astrologer Name (Optional)</label>
                  <input
                    type="text"
                    value={formAstrologer}
                    onChange={(e) => setFormAstrologer(e.target.value)}
                    placeholder="e.g. Pandit Rameshwar"
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
                  />
                </div>

                {/* Error */}
                {formError && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-xl border border-red-200">{formError}</p>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3 rounded-2xl shadow-md transition-all hover:shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    {editingId ? 'Save Changes' : 'Submit Review'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="px-6 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FILTERS & SORT BAR ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews, astrologers..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-amber-100 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-sm transition-all"
            />
          </div>

          {/* Star filter pills */}
          <div className="flex gap-2 items-center">
            {[5, 4, 3, 2, 1].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStar(filterStar === s ? null : s)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                  filterStar === s
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                <Star className="w-3 h-3 fill-current" /> {s}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen((p) => !p)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-amber-100 text-sm font-extrabold text-gray-700 shadow-sm hover:border-amber-300 transition-all"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              {SORT_OPTIONS.find((o) => o.val === sortBy)?.label}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                >
                  {SORT_OPTIONS.map(({ val, label, icon: Icon }) => (
                    <button
                      key={val}
                      onClick={() => { setSortBy(val); setFilterOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                        sortBy === val ? 'bg-amber-50 text-amber-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-amber-500" />
                      {label}
                      {sortBy === val && <Check className="w-3.5 h-3.5 ml-auto text-amber-500" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── ACTIVE FILTERS PILLS ── */}
        {(filterStar !== null || searchQuery) && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500 font-semibold">Active filters:</span>
            {filterStar !== null && (
              <span className="flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
                <Star className="w-3 h-3 fill-amber-500" /> {filterStar} Stars
                <button onClick={() => setFilterStar(null)} className="ml-0.5 hover:text-amber-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {searchQuery && (
              <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                <Search className="w-3 h-3" /> "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-0.5 hover:text-blue-900"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* ── RESULTS COUNT ── */}
        <p className="text-xs text-gray-500 font-semibold mb-4">
          Showing <span className="text-amber-600 font-extrabold">{filtered.length}</span> of {total} reviews
        </p>

        {/* ── REVIEW CARDS ── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white rounded-3xl border border-dashed border-amber-200"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-extrabold text-gray-800 mb-2">No reviews found</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-6">
              {searchQuery || filterStar !== null
                ? 'Try adjusting your filters or search query.'
                : 'Be the first to share your experience with the community!'}
            </p>
            {!showForm && (
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" /> Write a Review
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            <AnimatePresence>
              {filtered.map((review, idx) => {
                const isOwn = review.userId === MOCK_USER.id;
                return (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                    className={`bg-white rounded-3xl border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col overflow-hidden ${
                      isOwn ? 'border-amber-300 ring-1 ring-amber-200' : 'border-amber-100 hover:border-amber-200'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start gap-3 p-5 pb-3">
                      <Avatar name={review.userName} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-gray-900 text-sm">{review.userName}</span>
                          {review.verified && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">
                              <Check className="w-2.5 h-2.5" /> Verified
                            </span>
                          )}
                          {isOwn && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Your Review</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <StarDisplay rating={review.rating} size="sm" />
                          <span className="text-xs text-gray-400 font-medium">
                            <Clock className="w-3 h-3 inline mr-0.5 -mt-px" />
                            {formatDate(review.date)}
                          </span>
                        </div>
                        {review.astrologerName && (
                          <p className="text-xs text-amber-600 font-semibold mt-0.5">
                            <Sparkles className="w-3 h-3 inline mr-0.5 -mt-px" />
                            Consulted: {review.astrologerName}
                          </p>
                        )}
                      </div>

                      {/* Edit / Delete (own only) */}
                      {isOwn && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(review)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 hover:text-amber-700 transition-colors"
                            title="Edit review"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(review.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="px-5 pb-3 flex-1">
                      <h4 className="font-extrabold text-gray-900 text-sm mb-1.5">{review.title}</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{review.body}</p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 mt-auto">
                      <button
                        onClick={() => toggleLike(review.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-all px-3 py-1.5 rounded-xl ${
                          review.liked ? 'bg-amber-50 text-amber-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${review.liked ? 'fill-amber-400 text-amber-400' : ''}`} />
                        Helpful ({review.likes})
                      </button>
                      <div className="flex items-center gap-0.5">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    {/* Delete confirmation inline */}
                    <AnimatePresence>
                      {deleteConfirm === review.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-5 py-3 bg-red-50 border-t border-red-100 overflow-hidden"
                        >
                          <p className="text-xs text-red-700 font-semibold mb-2.5">Are you sure you want to delete this review? This cannot be undone.</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDelete(review.id)}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-extrabold py-2 rounded-xl transition-all"
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 text-xs font-extrabold py-2 rounded-xl border border-gray-200 transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ── BOTTOM CTA ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-8 shadow-xl shadow-amber-200/50 text-white"
        >
          <h2 className="text-2xl font-black mb-2">Had a great experience?</h2>
          <p className="text-white/80 text-sm font-medium mb-5">Help others discover HealConnect by sharing your story.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-white text-amber-700 font-extrabold px-6 py-3 rounded-2xl hover:bg-amber-50 transition-all shadow-md"
            >
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              Write a Review
            </button>
            <Link
              href="/practitioners"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-extrabold px-6 py-3 rounded-2xl transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Book a Session
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
