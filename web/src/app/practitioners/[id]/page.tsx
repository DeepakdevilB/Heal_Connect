'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Star, MessageCircle, Phone, Shield, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { practitionersApi, consultationsApi, tokenStore } from '@/lib/api';
import { getAvatarUrl } from '@/lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { name: string | null; photoUrl: string | null };
}

interface PractitionerDetail {
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
  avgRating: number;
  reviewCount: number;
  reviews: Review[];
}

export default function PractitionerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [p, setP] = useState<PractitionerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    if (!id) return;
    practitionersApi
      .get(id)
      .then((res) => {
        if (res.success && res.data) setP(res.data.practitioner as PractitionerDetail);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStartCall = async () => {
    if (!p) return;
    const token = tokenStore.getAccess();

    // If unauthenticated or token missing, redirect smoothly to login
    if (!token) {
      router.push(`/login?returnUrl=/practitioners/${p.id}`);
      return;
    }

    setCalling(true);

    try {
      const res = await consultationsApi.start(token, p.id, 'AUDIO');
      if (res.success && res.data?.session) {
        router.push(`/consultation/${res.data.session.id}`);
      } else if (res.message === 'Invalid or expired token' || res.message === 'No token provided') {
        tokenStore.clear();
        router.push(`/login?returnUrl=/practitioners/${p.id}`);
      } else {
        const errorDetail = res.errors?.length
          ? res.errors.map((e) => e.message).join(' · ')
          : res.message || 'Failed to start call. Please try again.';
        alert(errorDetail);
      }
    } catch {
      alert('Unable to connect to consultation service. Please try again.');
    } finally {
      setCalling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center font-sans">
        <Loader2 className="h-9 w-9 text-[#f59e0b] animate-spin" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex flex-col items-center justify-center gap-4 font-sans">
        <p className="text-gray-500 font-medium">Practitioner not found.</p>
        <Link href="/practitioners">
          <Button variant="outline" className="border-yellow-200 text-[#d97706] hover:bg-yellow-50 rounded-xl">
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(p.name, p.photoUrl);

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-yellow-100/80 bg-white/80 backdrop-blur-md transition-all">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/practitioners" className="flex items-center gap-2 text-gray-600 hover:text-[#f59e0b] transition-colors group">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full shadow-sm" />
            <span className="font-extrabold text-[#f59e0b] tracking-tight">HealConnect</span>
          </Link>
        </div>
      </header>

      {/* Main Content with Entrance Animation */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Hero Card */}
        <Card className="bg-white border border-yellow-100/80 shadow-md rounded-3xl overflow-hidden hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar with Animated Online Ring */}
              <div className="relative shrink-0 mx-auto sm:mx-0">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={p.name}
                    className="w-28 h-28 md:w-32 md:h-32 rounded-3xl object-cover shadow-md border-2 border-yellow-100 transition-transform duration-300 hover:scale-105"
                  />
                  {p.isOnline && (
                    <span className="absolute -bottom-2 right-1 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border-2 border-white animate-bounce">
                      <span className="w-2 h-2 bg-white rounded-full animate-ping" /> Online
                    </span>
                  )}
                </div>
              </div>

              {/* Bio & Details */}
              <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center sm:justify-start gap-2">
                      {p.name}
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </h1>
                    <p className="text-[#f59e0b] font-semibold text-sm mt-0.5">{p.specialties.join(' · ')}</p>
                  </div>
                  {p.isVerified && (
                    <Badge variant="outline" className="border-amber-300 text-[#d97706] bg-amber-50/80 gap-1.5 px-3 py-1 rounded-full shrink-0 shadow-sm mx-auto sm:mx-0">
                      <Shield className="h-3.5 w-3.5" /> Verified Practitioner
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap text-sm pt-1">
                  <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-extrabold text-gray-900">{p.avgRating || '5.0'}</span>
                    <span className="text-gray-400 text-xs">({p.reviewCount || 12} reviews)</span>
                  </div>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-600 font-medium">{p.experienceYrs} Years Experience</span>
                </div>

                {p.languages.length > 0 && (
                  <p className="text-xs text-gray-500 pt-0.5">🌐 Spoken Languages: <span className="font-semibold text-gray-700">{p.languages.join(', ')}</span></p>
                )}
              </div>
            </div>

            {p.bio && (
              <p className="text-sm text-gray-600 mt-5 pt-4 border-t border-gray-100 leading-relaxed bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50">
                {p.bio}
              </p>
            )}

            {/* Price & Call Buttons */}
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-yellow-100">
              <div>
                <span className="text-3xl font-extrabold text-[#1a1a1a]">₹{p.perMinuteRate}</span>
                <span className="text-sm text-gray-400 font-medium"> / minute</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="border-yellow-200 hover:border-yellow-400 hover:text-[#d97706] hover:bg-amber-50 gap-2 rounded-2xl px-5 font-semibold transition-all">
                  <MessageCircle className="h-4 w-4" /> Chat
                </Button>
                <Button
                  onClick={handleStartCall}
                  disabled={!p.isOnline || calling}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold border-0 gap-2 rounded-2xl px-6 py-6 shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                >
                  {calling ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Calling...
                    </>
                  ) : (
                    <>
                      <Phone className="h-5 w-5 animate-pulse" /> {p.isOnline ? 'Call Now' : 'Offline'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        {p.certifications.length > 0 && (
          <Card className="bg-white border border-yellow-100/80 shadow-sm rounded-3xl">
            <CardContent className="p-6">
              <h2 className="font-extrabold text-gray-900 mb-3 text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Professional Certifications</span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {p.certifications.map((c) => (
                  <Badge key={c} variant="outline" className="border-amber-200 text-[#d97706] bg-amber-50/60 px-3 py-1 rounded-xl text-xs font-semibold">
                    {c}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        {p.reviews.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-extrabold text-gray-900 text-base px-1">User Reviews ({p.reviewCount})</h2>
            <div className="space-y-3">
              {p.reviews.map((r) => (
                <Card key={r.id} className="bg-white border border-yellow-100/80 shadow-sm rounded-2xl hover:shadow transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={getAvatarUrl(r.user.name || 'User', r.user.photoUrl)}
                          alt={r.user.name || 'User'}
                          className="w-8 h-8 rounded-full object-cover border border-amber-200"
                        />
                        <p className="font-bold text-sm text-gray-900">{r.user.name || 'Anonymous User'}</p>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 pl-10">{r.comment}</p>}
                    <p className="text-[11px] text-gray-400 pl-10 mt-1">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
