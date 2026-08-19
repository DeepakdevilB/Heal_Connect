'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Search, BookOpen, Clock, User, Eye, Heart, Share2,
  TrendingUp, Tag, Globe, ArrowRight, Mail, Check, X, ChevronRight,
  Layers, Star, Sun, Flame, MessageSquare, ThumbsUp, Compass,
  Edit2, Trash2, Plus, PlayCircle, Headphones, Bookmark, ExternalLink, Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/navbar';

// --- BLOG CATEGORIES ---
const CATEGORIES = [
  { id: 'all', label: 'All Articles', icon: Globe },
  { id: 'kundli', label: 'Kundli', icon: Layers },
  { id: 'numerology', label: 'Numerology', icon: Sparkles },
  { id: 'tarot', label: 'Tarot', icon: Compass },
  { id: 'vedic', label: 'Vedic Astrology', icon: Sun },
  { id: 'zodiac', label: 'Zodiac Signs', icon: Star },
  { id: 'compatibility', label: 'Compatibility', icon: Heart },
  { id: 'horoscope', label: 'Horoscope', icon: Clock },
  { id: 'festivals', label: 'Festivals', icon: Flame },
  { id: 'gemstones', label: 'Gemstones', icon: Tag },
  { id: 'vastu', label: 'Vastu Shastra', icon: BookOpen },
];

// ARTICLES fetched dynamically

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // ── ASTROLOGER ROLE STATE ──
  const [isPractitioner, setIsPractitioner] = useState(false);
  const [practitionerName, setPractitionerName] = useState('Astrologer');
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── BLOG WRITE/EDIT FORM STATE ──
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState({
    title: '', category: 'kundli', excerpt: '', content: '', tags: '', image: ''
  });
  const [blogFormError, setBlogFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [blogSuccess, setBlogSuccess] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('hc_role');
      const name = localStorage.getItem('hc_practitioner_name');
      if (role === 'practitioner') {
        setIsPractitioner(true);
        setPractitionerName(name || 'Astrologer');
      }
    }

    const fetchBlogs = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${API_URL}/api/blogs`).then(r => r.json());
        if (res.success) {
          const mapped = res.data.blogs.map((b: any) => ({
            id: b.id,
            slug: b.id,
            title: b.title,
            category: 'General',
            excerpt: b.content.substring(0, 150) + '...',
            image: b.imageUrl || '/guide_12_houses.jpg',
            author: { name: b.author || 'Admin', role: 'Author', avatar: '/astrologer_avatar_1.jpg' },
            date: new Date(b.createdAt).toLocaleDateString(),
            readTime: '5 min read',
            views: '0',
            likes: 0,
            trending: false,
            tags: [],
            content: b.content
          }));
          setAllArticles(mapped);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  const filteredArticles = allArticles.filter((art) => {
    const matchesCategory = selectedCategory === 'all' || art.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const trendingArticles = allArticles.filter((a) => a.trending);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (subscribedEmail) {
      setIsSubscribed(true);
      setTimeout(() => setIsSubscribed(false), 4000);
      setSubscribedEmail('');
    }
  };

  // ── OPEN WRITE FORM ──
  const openWriteForm = () => {
    setEditingArticleId(null);
    setBlogForm({ title: '', category: 'kundli', excerpt: '', content: '', tags: '', image: '' });
    setBlogFormError('');
    setShowBlogForm(true);
  };

  // ── OPEN EDIT FORM ──
  const openEditForm = (art: any) => {
    setEditingArticleId(art.id);
    setBlogForm({
      title: art.title,
      category: art.category.toLowerCase(),
      excerpt: art.excerpt,
      content: art.content.replace(/<[^>]*>/g, ''),
      tags: art.tags.join(', '),
      image: art.image || ''
    });
    setBlogFormError('');
    setShowBlogForm(true);
    setSelectedArticle(null);
  };

  // ── SUBMIT BLOG FORM ──
  const handleBlogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogForm.title.trim()) { setBlogFormError('Title is required.'); return; }
    if (!blogForm.excerpt.trim() || blogForm.excerpt.length < 30) { setBlogFormError('Excerpt must be at least 30 characters.'); return; }
    if (!blogForm.content.trim() || blogForm.content.length < 100) { setBlogFormError('Article body must be at least 100 characters.'); return; }

    const tagsArray = blogForm.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const wordCount = blogForm.content.trim().split(/\s+/).length;
    const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;
    const htmlContent = blogForm.content
      .split('\n\n').map((p) => p.trim()).filter(Boolean)
      .map((p) => `<p class="leading-relaxed text-gray-700">${p}</p>`).join('\n');

    if (editingArticleId) {
      setAllArticles((prev) => prev.map((a) =>
        a.id === editingArticleId
          ? { ...a, title: blogForm.title.trim(), category: CATEGORIES.find((c) => c.id === blogForm.category)?.label || blogForm.category,
              excerpt: blogForm.excerpt.trim(), content: htmlContent,
              tags: tagsArray, image: blogForm.image || a.image, readTime }
          : a
      ));
      setBlogSuccess('Article updated successfully!');
    } else {
      const newArticle = {
        id: `practitioner-${Date.now()}`, slug: `practitioner-${Date.now()}`,
        title: blogForm.title.trim(),
        category: CATEGORIES.find((c) => c.id === blogForm.category)?.label || blogForm.category,
        trending: false, excerpt: blogForm.excerpt.trim(),
        image: blogForm.image || '/guide_kundli_basics.jpg',
        author: { name: practitionerName, role: 'Verified Astrologer', avatar: '' },
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        readTime, views: '0', likes: 0,
        tags: tagsArray.length ? tagsArray : [blogForm.category],
        content: htmlContent, practitionerPost: true,
      };
      setAllArticles((prev) => [newArticle, ...prev]);
      setBlogSuccess('Article published successfully!');
    }
    setShowBlogForm(false);
    setEditingArticleId(null);
    setTimeout(() => setBlogSuccess(''), 4000);
  };

  // ── DELETE ARTICLE ──
  const handleDeleteArticle = (id: string) => {
    setAllArticles((prev) => prev.filter((a) => a.id !== id));
    setDeleteConfirmId(null);
    setSelectedArticle(null);
    setBlogSuccess('Article deleted.');
    setTimeout(() => setBlogSuccess(''), 3000);
  };

  return (
    <div className="min-h-screen bg-[#fffbf0] text-gray-900 flex flex-col font-sans">
      <Navbar />

      {/* ══ HERO SECTION ══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 pt-28 pb-20 px-4 text-center text-white">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10 space-y-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
            <span>ASTROLOGY KNOWLEDGE HUB • HEALCONNECT BLOG</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-md py-1">
            Astrology Blogs &amp; Insights
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-xl text-white/90 font-medium max-w-3xl mx-auto leading-relaxed">
            Discover expert Vedic insights on Janam Kundli, Numerology, Tarot, Nakshatras, planetary transits, auspicious yogas, and spiritual growth.
          </motion.p>

          {/* SEARCH BAR */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-2xl mx-auto pt-4 relative">
            <div className="relative">
              <Search className="w-5 h-5 text-amber-500 absolute left-5 top-4" />
              <input type="text" placeholder="Let's find what you're looking for..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-full bg-white text-gray-900 placeholder-gray-400 font-semibold text-sm shadow-2xl focus:outline-none focus:ring-4 focus:ring-amber-300/50 transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-5 top-4 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SUCCESS TOAST ── */}
      <AnimatePresence>
        {blogSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white font-extrabold px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> {blogSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLOATING WRITE POST BUTTON (Astrologer Only) ── */}
      {isPractitioner && !showBlogForm && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={openWriteForm}
          className="fixed bottom-8 right-8 z-40 flex items-center gap-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold px-6 py-4 rounded-2xl shadow-2xl shadow-amber-300/60 hover:from-amber-600 hover:to-orange-600 transition-all"
        >
          <Plus className="w-5 h-5" />
          Write Post
        </motion.button>
      )}

      {/* ── BLOG WRITE / EDIT FORM MODAL ── */}
      <AnimatePresence>
        {showBlogForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl my-8 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-white">{editingArticleId ? 'Edit Article' : 'Write New Blog Post'}</h2>
                    <p className="text-white/70 text-xs font-medium">Publishing as <span className="font-extrabold text-white">{practitionerName}</span></p>
                  </div>
                </div>
                <button onClick={() => { setShowBlogForm(false); setEditingArticleId(null); }}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleBlogSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Article Title *</label>
                  <input type="text" value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                    placeholder="e.g. The Power of Jupiter Transit in 2026" maxLength={120}
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Category *</label>
                    <select value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all">
                      {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Cover Image URL (Optional)</label>
                    <input type="text" value={blogForm.image} onChange={(e) => setBlogForm({ ...blogForm, image: e.target.value })}
                      placeholder="/guide_kundli_basics.jpg"
                      className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Short Excerpt * <span className="text-gray-400 font-normal normal-case">(min 30 chars)</span></label>
                  <textarea value={blogForm.excerpt} onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                    placeholder="A compelling one-paragraph summary that appears on article cards..." rows={2}
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                    Article Body * <span className="text-gray-400 font-normal normal-case">(min 100 chars — blank line = new paragraph)</span>
                  </label>
                  <textarea value={blogForm.content} onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                    placeholder="Write your full article here. Use blank lines between paragraphs."
                    rows={10} className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all resize-y" />
                  <p className="text-xs text-gray-400 mt-1 text-right">{blogForm.content.trim().split(/\s+/).filter(Boolean).length} words</p>
                </div>
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">Tags <span className="text-gray-400 font-normal normal-case">(comma-separated)</span></label>
                  <input type="text" value={blogForm.tags} onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
                    placeholder="e.g. Jupiter, Transit, Career, Vedic Astrology"
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all" />
                </div>
                {blogFormError && (
                  <p className="text-xs text-red-600 font-semibold bg-red-50 px-3 py-2 rounded-xl border border-red-200">{blogFormError}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="submit"
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold py-3.5 rounded-2xl shadow-md transition-all hover:shadow-lg">
                    <Check className="w-4 h-4" />
                    {editingArticleId ? 'Save Changes' : 'Publish Article'}
                  </button>
                  <button type="button" onClick={() => { setShowBlogForm(false); setEditingArticleId(null); }}
                    className="px-6 py-3.5 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-grow container mx-auto px-4 py-12 max-w-6xl space-y-16">

        {/* ══ CATEGORIES CHIPS ══ */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4 border-b border-amber-200/80 pb-6 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 border ${isActive ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-gray-700 border-amber-200 hover:bg-amber-50'}`}>
                    <cat.icon className="w-3.5 h-3.5" /> {cat.label}
                  </button>
                );
              })}
            </div>
            {isPractitioner && (
              <button onClick={openWriteForm}
                className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-4 py-2 rounded-full transition-all shadow-md">
                <Plus className="w-3.5 h-3.5" /> Write Post
              </button>
            )}
          </div>
        </section>

        {/* ══ TRENDING STORIES (HERO FEATURED CARDS) ══ */}
        {selectedCategory === 'all' && !searchQuery && trendingArticles.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Trending Stories</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {trendingArticles.map((art) => (
                <motion.div key={art.id} whileHover={{ y: -4 }} onClick={() => setSelectedArticle(art)}
                  className="bg-white border border-amber-100 hover:border-amber-300 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between">
                  <div className="relative h-56 w-full overflow-hidden">
                    <img src={art.image} alt={art.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-4 left-4 bg-amber-500 text-white text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md">
                      {art.category}
                    </span>
                  </div>
                  <div className="p-6 space-y-3 flex-grow flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{art.readTime}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{art.views} views</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-gray-900 leading-snug hover:text-amber-600 transition-colors">{art.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{art.excerpt}</p>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-extrabold text-xs flex items-center justify-center">
                          {art.author.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-gray-900">{art.author.name}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{art.date}</p>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-amber-600 flex items-center gap-1 hover:gap-2 transition-all">
                        Read Story <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ══ ARTICLES GRID ══ */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Latest Articles</h2>
            <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
              Showing {filteredArticles.length} Articles
            </span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-amber-100 space-y-3">
              <Search className="w-12 h-12 mx-auto text-amber-300" />
              <h3 className="text-lg font-bold text-gray-800">No matching articles found</h3>
              <p className="text-xs text-gray-500">Try searching for a different topic or select another category above.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredArticles.map((art) => (
                <motion.div key={art.id} whileHover={{ y: -4 }}
                  className="bg-white border border-amber-100 hover:border-amber-300 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between relative">
                  {/* Astrologer Edit/Delete Controls */}
                  {isPractitioner && art.practitionerPost && (
                    <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); openEditForm(art); }}
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 shadow-sm transition-colors" title="Edit post">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(art.id); }}
                        className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg border border-red-200 text-red-500 hover:bg-red-50 shadow-sm transition-colors" title="Delete post">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div onClick={() => setSelectedArticle(art)} className="cursor-pointer">
                    <div className="relative h-44 w-full overflow-hidden">
                      <img src={art.image} alt={art.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full">
                        {art.category}
                      </span>
                      {art.practitionerPost && (
                        <span className="absolute bottom-3 left-3 bg-purple-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          ✦ Astrologer
                        </span>
                      )}
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{art.readTime}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{art.views}</span>
                      </div>
                      <h3 className="text-base font-extrabold text-gray-900 line-clamp-2 leading-snug hover:text-amber-600 transition-colors">
                        {art.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{art.excerpt}</p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    {/* Delete confirmation inline */}
                    <AnimatePresence>
                      {deleteConfirmId === art.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mb-3 bg-red-50 border border-red-100 rounded-2xl p-3 overflow-hidden"
                        >
                          <p className="text-xs text-red-700 font-semibold mb-2">Delete this article permanently?</p>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteArticle(art.id)}
                              className="flex-1 bg-red-500 text-white text-xs font-extrabold py-1.5 rounded-xl hover:bg-red-600 transition-all">Delete</button>
                            <button onClick={() => setDeleteConfirmId(null)}
                              className="flex-1 bg-white text-gray-600 text-xs font-semibold py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all">Cancel</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div onClick={() => setSelectedArticle(art)} className="cursor-pointer pt-3 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-400">{art.date}</span>
                      <span className="text-xs font-extrabold text-amber-600 flex items-center gap-1">Read Article <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ══ NEWSLETTER SUBSCRIPTION SECTION ══ */}
        <section className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-8 md:p-12 text-center text-white relative overflow-hidden shadow-xl space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-xl mx-auto space-y-3 relative z-10">
            <Mail className="w-10 h-10 mx-auto text-yellow-200 animate-bounce" />
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Never Miss an Astrology Update</h2>
            <p className="text-white/90 text-xs md:text-sm font-medium">Subscribe to HealConnect daily astrological forecast newsletter and receive planetary transit guides directly in your inbox.</p>
          </div>

          <div className="max-w-md mx-auto relative z-10">
            {isSubscribed ? (
              <div className="p-4 rounded-full bg-white text-amber-800 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg">
                <Check className="w-5 h-5 text-emerald-600" /> Subscribed Successfully! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-center gap-2 bg-white/20 p-2 rounded-full backdrop-blur-md border border-white/30">
                <input type="email" required placeholder="Enter your email address" value={subscribedEmail}
                  onChange={(e) => setSubscribedEmail(e.target.value)}
                  className="w-full px-5 py-3 rounded-full bg-white text-gray-900 text-xs font-semibold placeholder-gray-400 focus:outline-none" />
                <button type="submit" className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-amber-50 text-amber-600 font-extrabold text-xs rounded-full shrink-0 shadow-md transition-all">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </section>

      </main>

      {/* ══ ARTICLE READER MODAL ══ */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button onClick={() => setSelectedArticle(null)} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              {/* Astrologer Edit/Delete in reader */}
              {isPractitioner && selectedArticle.practitionerPost && (
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <button onClick={() => openEditForm(selectedArticle)}
                    className="flex items-center gap-1.5 bg-white text-amber-700 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-md border border-amber-200 hover:bg-amber-50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDeleteArticle(selectedArticle.id)}
                    className="flex items-center gap-1.5 bg-white text-red-600 text-xs font-extrabold px-3 py-1.5 rounded-xl shadow-md border border-red-200 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}

              <div className="relative h-64 md:h-80 w-full">
                <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6">
                  <div className="space-y-2 text-white">
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
                      {selectedArticle.category}
                    </span>
                    <h2 className="text-2xl md:text-4xl font-extrabold leading-tight">{selectedArticle.title}</h2>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100 text-xs font-semibold text-gray-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-extrabold text-sm flex items-center justify-center">
                      {selectedArticle.author.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-sm">{selectedArticle.author.name}</p>
                      <p className="text-[10px] text-gray-400">{selectedArticle.author.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{selectedArticle.readTime}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{selectedArticle.views} Views</span>
                  </div>
                </div>

                <div className="prose prose-amber max-w-none text-xs md:text-sm text-gray-700 space-y-4"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />

                <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedArticle.tags.map((t: string) => (
                      <span key={t} className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold">#{t}</span>
                    ))}
                  </div>
                  <button onClick={() => toast.success('Article link copied to clipboard!')} className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-extrabold flex items-center gap-1.5 transition-colors">
                    <Share2 className="w-3.5 h-3.5" /> Share Article
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ FOOTER ══ */}
      <footer className="bg-gradient-to-b from-amber-50 to-yellow-50 text-gray-700 pt-12 pb-6 border-t border-amber-100 mt-16">
        <div className="container mx-auto px-4 max-w-6xl text-center text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} HealConnect Blog. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
