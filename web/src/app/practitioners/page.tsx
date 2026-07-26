'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Star, MessageCircle, Phone, SlidersHorizontal, X, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/navbar';
import { getPractitionerAvatar } from '@/lib/utils';

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

const SELECT_CLS = 'w-full text-sm rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/40';

export default function PractitionersPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ search: '', specialty: '', language: '', minRating: '', maxRate: '', onlineOnly: false });

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
      const data = await res.json() as { success: boolean; data: { practitioners: Practitioner[]; pagination: { total: number } } };
      if (data.success) {
        setPractitioners(p === 1 ? data.data.practitioners : (prev) => [...prev, ...data.data.practitioners]);
        setTotal(data.data.pagination.total);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { setPage(1); fetchPractitioners(filters, 1); }, [filters, fetchPractitioners]);

  const activeFilterCount = [filters.specialty, filters.language, filters.minRating, filters.maxRate].filter(Boolean).length + (filters.onlineOnly ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#1a1a1a] mb-1">Find Your Healer</h1>
          <p className="text-gray-500">{total} verified practitioners available</p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search by name or specialty..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-yellow-50 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/40 text-[#1a1a1a] placeholder:text-gray-400" />
          </div>
          <Button variant="outline" onClick={() => setShowFilters((v) => !v)} className="rounded-full gap-2 border-yellow-200 hover:bg-yellow-50 text-[#1a1a1a]">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-[#f59e0b] text-white text-xs flex items-center justify-center">{activeFilterCount}</span>}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-5 rounded-2xl bg-white border border-yellow-100 shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Specialty</label>
              <select value={filters.specialty} onChange={(e) => setFilters((f) => ({ ...f, specialty: e.target.value }))} className={SELECT_CLS}>
                <option value="">All</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Language</label>
              <select value={filters.language} onChange={(e) => setFilters((f) => ({ ...f, language: e.target.value }))} className={SELECT_CLS}>
                <option value="">All</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Min Rating</label>
              <select value={filters.minRating} onChange={(e) => setFilters((f) => ({ ...f, minRating: e.target.value }))} className={SELECT_CLS}>
                <option value="">Any</option>
                {['3', '3.5', '4', '4.5'].map((r) => <option key={r} value={r}>⭐ {r}+</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Max ₹/min</label>
              <input type="number" min={0} placeholder="e.g. 50" value={filters.maxRate} onChange={(e) => setFilters((f) => ({ ...f, maxRate: e.target.value }))} className={SELECT_CLS} />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.onlineOnly} onChange={(e) => setFilters((f) => ({ ...f, onlineOnly: e.target.checked }))} className="w-4 h-4 accent-[#f59e0b]" />
                <span className="text-sm text-[#1a1a1a]">Online Now</span>
              </label>
              {activeFilterCount > 0 && (
                <button onClick={() => setFilters({ search: filters.search, specialty: '', language: '', minRating: '', maxRate: '', onlineOnly: false })} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                  <X className="h-3 w-3" /> Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {filters.specialty && <Badge variant="outline" className="border-yellow-300 text-[#d97706] bg-yellow-50 gap-1">{filters.specialty}<button onClick={() => setFilters((f) => ({ ...f, specialty: '' }))}><X className="h-3 w-3" /></button></Badge>}
            {filters.language && <Badge variant="outline" className="border-yellow-300 text-[#d97706] bg-yellow-50 gap-1">{filters.language}<button onClick={() => setFilters((f) => ({ ...f, language: '' }))}><X className="h-3 w-3" /></button></Badge>}
            {filters.minRating && <Badge variant="outline" className="border-yellow-300 text-[#d97706] bg-yellow-50 gap-1">⭐ {filters.minRating}+<button onClick={() => setFilters((f) => ({ ...f, minRating: '' }))}><X className="h-3 w-3" /></button></Badge>}
            {filters.maxRate && <Badge variant="outline" className="border-yellow-300 text-[#d97706] bg-yellow-50 gap-1">≤ ₹{filters.maxRate}/min<button onClick={() => setFilters((f) => ({ ...f, maxRate: '' }))}><X className="h-3 w-3" /></button></Badge>}
            {filters.onlineOnly && <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-50 gap-1">Online Now<button onClick={() => setFilters((f) => ({ ...f, onlineOnly: false }))}><X className="h-3 w-3" /></button></Badge>}
          </div>
        )}

        {/* Grid */}
        {loading && practitioners.length === 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-2xl bg-yellow-50 animate-pulse" />)}
          </div>
        ) : practitioners.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Image src="/logo.png" alt="" width={40} height={40} className="mx-auto mb-3 opacity-30 rounded-full" />
            <p className="text-lg font-medium">No practitioners found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {practitioners.map((p) => <PractitionerCard key={p.id} practitioner={p} />)}
            </div>
            {practitioners.length < total && (
              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => { const next = page + 1; setPage(next); fetchPractitioners(filters, next); }} disabled={loading} className="rounded-full px-8 border-yellow-300 text-[#d97706] hover:bg-yellow-50">
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
  const avatarSrc = getPractitionerAvatar(p.photoUrl, p.id);

  return (
    <Card onClick={() => router.push(`/practitioners/${p.id}`)} className="bg-white border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all cursor-pointer rounded-2xl overflow-hidden group h-full">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top strip with avatar */}
        <div className="relative h-16 bg-gradient-to-r from-amber-50 to-orange-50 shrink-0">
          <div className="absolute -bottom-7 left-5">
            <img src={avatarSrc} alt={p.name} className="w-14 h-14 rounded-xl object-cover shadow-md border-2 border-white" />
          </div>
          <div className="absolute top-3 right-4">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              p.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
              {p.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="pt-10 px-5 pb-5 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="font-bold text-gray-900 text-base">{p.name}</p>
              <p className="text-sm text-amber-600 font-medium">{p.specialties.slice(0, 2).join(' · ') || '—'}</p>
            </div>
            {p.isVerified && (
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 shrink-0">
                <Shield className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] font-semibold text-amber-700">Verified</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span className="text-sm font-semibold text-gray-900">{p.avgRating || '—'}</span>
              <span className="text-xs text-gray-400">({p.reviewCount})</span>
            </div>
            <span className="text-gray-200">|</span>
            <span className="text-xs text-gray-500">{p.experienceYrs} yrs exp</span>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500 truncate max-w-[80px]">{p.languages.slice(0, 2).join(', ') || '—'}</span>
            </div>
          </div>

          {/* Bio — always takes up space even if empty */}
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
            {p.bio || ''}
          </p>

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
            <div>
              <span className="text-lg font-bold text-gray-900">₹{p.perMinuteRate}</span>
              <span className="text-xs text-gray-400">/min</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 px-3 border-gray-200 hover:border-amber-300 hover:text-amber-700 text-xs gap-1" onClick={(e) => { e.stopPropagation(); router.push('/login'); }}>
                <MessageCircle className="h-3.5 w-3.5" /> Chat
              </Button>
              <Button size="sm" disabled={!p.isOnline} className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs gap-1 disabled:opacity-40" onClick={(e) => { e.stopPropagation(); router.push('/login'); }}>
                <Phone className="h-3.5 w-3.5" /> Call
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
