'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, Star, MessageCircle, Phone, Sparkles, SlidersHorizontal, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';

interface Practitioner {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  languages: string[];
  certifications: string[];
  experienceYrs: number;
  perMinuteRate: number;
  photoUrl: string | null;
  isVerified: boolean;
  isOnline: boolean;
  avgRating: number;
  reviewCount: number;
}

interface Filters {
  search: string;
  specialty: string;
  language: string;
  minRating: string;
  maxRate: string;
  onlineOnly: boolean;
}

const SPECIALTIES = ['Vedic Astrology', 'Tarot', 'Reiki', 'Vastu', 'Numerology', 'Palmistry', 'Energy Healing'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Marathi'];

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function PractitionersPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '', specialty: '', language: '', minRating: '', maxRate: '', onlineOnly: false,
  });

  const fetchPractitioners = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '12' });
      if (f.search) params.set('search', f.search);
      if (f.specialty) params.set('specialty', f.specialty);
      if (f.language) params.set('language', f.language);
      if (f.minRating) params.set('minRating', f.minRating);
      if (f.maxRate) params.set('maxRate', f.maxRate);
      if (f.onlineOnly) params.set('onlineOnly', 'true');

      const res = await fetch(`${API_URL}/api/practitioners?${params}`);
      const data = await res.json() as {
        success: boolean;
        data: { practitioners: Practitioner[]; pagination: { total: number } };
      };

      if (data.success) {
        setPractitioners(p === 1 ? data.data.practitioners : (prev) => [...prev, ...data.data.practitioners]);
        setTotal(data.data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPractitioners(filters, 1);
  }, [filters, fetchPractitioners]);

  const activeFilterCount = [
    filters.specialty, filters.language, filters.minRating, filters.maxRate,
  ].filter(Boolean).length + (filters.onlineOnly ? 1 : 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">HealConnect</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-1">Find Your Healer</h1>
          <p className="text-muted-foreground">{total} verified practitioners available</p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or specialty..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className="rounded-full gap-2 border-border"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-5 rounded-2xl bg-card border border-border grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Specialty</label>
              <select
                value={filters.specialty}
                onChange={(e) => setFilters((f) => ({ ...f, specialty: e.target.value }))}
                className="w-full text-sm rounded-lg bg-muted border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">All</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Language</label>
              <select
                value={filters.language}
                onChange={(e) => setFilters((f) => ({ ...f, language: e.target.value }))}
                className="w-full text-sm rounded-lg bg-muted border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">All</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min Rating</label>
              <select
                value={filters.minRating}
                onChange={(e) => setFilters((f) => ({ ...f, minRating: e.target.value }))}
                className="w-full text-sm rounded-lg bg-muted border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="">Any</option>
                {['3', '3.5', '4', '4.5'].map((r) => <option key={r} value={r}>⭐ {r}+</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Max ₹/min</label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 50"
                value={filters.maxRate}
                onChange={(e) => setFilters((f) => ({ ...f, maxRate: e.target.value }))}
                className="w-full text-sm rounded-lg bg-muted border border-border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlineOnly}
                  onChange={(e) => setFilters((f) => ({ ...f, onlineOnly: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-foreground">Online Now</span>
              </label>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => setFilters({ search: filters.search, specialty: '', language: '', minRating: '', maxRate: '', onlineOnly: false })}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <X className="h-3 w-3" /> Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {filters.specialty && (
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 gap-1">
                {filters.specialty}
                <button onClick={() => setFilters((f) => ({ ...f, specialty: '' }))}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {filters.language && (
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 gap-1">
                {filters.language}
                <button onClick={() => setFilters((f) => ({ ...f, language: '' }))}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {filters.minRating && (
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 gap-1">
                ⭐ {filters.minRating}+
                <button onClick={() => setFilters((f) => ({ ...f, minRating: '' }))}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {filters.maxRate && (
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 gap-1">
                ≤ ₹{filters.maxRate}/min
                <button onClick={() => setFilters((f) => ({ ...f, maxRate: '' }))}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {filters.onlineOnly && (
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-1">
                Online Now
                <button onClick={() => setFilters((f) => ({ ...f, onlineOnly: false }))}><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        )}

        {/* Grid */}
        {loading && practitioners.length === 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : practitioners.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No practitioners found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {practitioners.map((p) => (
                <PractitionerCard key={p.id} practitioner={p} />
              ))}
            </div>

            {practitioners.length < total && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchPractitioners(filters, next);
                  }}
                  disabled={loading}
                  className="rounded-full px-8 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PractitionerCard({ practitioner: p }: { practitioner: Practitioner }) {
  const router = useRouter();
  const initials = p.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const gradients = [
    'from-indigo-500 to-purple-600', 'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600', 'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600', 'from-violet-500 to-purple-600',
  ];
  const gradient = gradients[p.name.charCodeAt(0) % gradients.length];

  return (
    <Card onClick={() => router.push(`/practitioners/${p.id}`)} className="bg-card border-border hover:border-indigo-500/30 transition-all group cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {p.photoUrl ? (
              <img
                src={p.photoUrl}
                alt={p.name}
                className="w-14 h-14 rounded-full object-cover shadow-lg"
              />
            ) : (
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>
                {initials}
              </div>
            )}
            {p.isOnline && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground truncate">{p.name}</p>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ml-2 ${p.isOnline ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}
              >
                {p.isOnline ? '● Online' : 'Offline'}
              </Badge>
            </div>

            <p className="text-sm text-indigo-400 font-medium truncate">
              {p.specialties.slice(0, 2).join(' · ')}
            </p>

            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-foreground">{p.avgRating || '—'}</span>
              <span className="text-xs text-muted-foreground">({p.reviewCount})</span>
              {p.isVerified && (
                <Badge variant="outline" className="ml-1 text-xs border-cyan-500/30 text-cyan-400 bg-cyan-500/10 py-0">
                  ✓ Verified
                </Badge>
              )}
            </div>

            {p.languages.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                🌐 {p.languages.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
        </div>

        {p.bio && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{p.bio}</p>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div>
            <span className="text-lg font-bold text-foreground">₹{p.perMinuteRate}</span>
            <span className="text-xs text-muted-foreground">/min</span>
            <p className="text-xs text-muted-foreground">{p.experienceYrs}yr exp</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 px-3 border-border hover:border-indigo-500/50 hover:text-indigo-400">
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              disabled={!p.isOnline}
              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white border-0 disabled:opacity-40"
            >
              <Phone className="h-3.5 w-3.5 mr-1" /> Call
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
