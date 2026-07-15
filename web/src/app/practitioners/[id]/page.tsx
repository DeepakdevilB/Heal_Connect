'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Star, MessageCircle, Phone, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { practitionersApi } from '@/lib/api';

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

const GRADIENTS = [
  'from-yellow-400 to-orange-500', 'from-emerald-400 to-teal-500',
  'from-pink-400 to-rose-500', 'from-blue-400 to-indigo-500',
];

export default function PractitionerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PractitionerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    practitionersApi.get(id).then((res) => {
      if (res.success && res.data) setP(res.data.practitioner as PractitionerDetail);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#f59e0b] animate-spin" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Practitioner not found.</p>
        <Link href="/practitioners"><Button variant="outline" className="border-yellow-200 text-[#d97706] hover:bg-yellow-50">Back to Directory</Button></Link>
      </div>
    );
  }

  const gradient = GRADIENTS[p.name.charCodeAt(0) % GRADIENTS.length];
  const initials = p.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-yellow-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/practitioners" className="flex items-center gap-2 text-gray-500 hover:text-[#f59e0b] transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="font-extrabold text-[#f59e0b]">HealConnect</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Hero Card */}
        <Card className="bg-white border border-yellow-100 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name} className="w-24 h-24 rounded-2xl object-cover shadow" />
                ) : (
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-3xl font-bold shadow`}>{initials}</div>
                )}
                {p.isOnline && (
                  <span className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Online
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h1 className="text-xl font-extrabold text-[#1a1a1a]">{p.name}</h1>
                    <p className="text-[#f59e0b] font-medium text-sm">{p.specialties.join(' · ')}</p>
                  </div>
                  {p.isVerified && (
                    <Badge variant="outline" className="border-yellow-300 text-[#d97706] bg-yellow-50 gap-1 shrink-0">
                      <Shield className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-semibold text-[#1a1a1a]">{p.avgRating || '—'}</span>
                    <span className="text-sm text-gray-400">({p.reviewCount} reviews)</span>
                  </div>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500">{p.experienceYrs} yrs exp</span>
                </div>
                {p.languages.length > 0 && <p className="text-sm text-gray-400 mt-1">🌐 {p.languages.join(', ')}</p>}
              </div>
            </div>

            {p.bio && <p className="text-sm text-gray-500 mt-4 leading-relaxed">{p.bio}</p>}

            <div className="flex items-center justify-between mt-5 pt-5 border-t border-yellow-100">
              <div>
                <span className="text-2xl font-extrabold text-[#1a1a1a]">₹{p.perMinuteRate}</span>
                <span className="text-sm text-gray-400">/min</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="border-yellow-200 hover:border-yellow-400 hover:text-[#d97706] gap-2">
                  <MessageCircle className="h-4 w-4" /> Chat
                </Button>
                <Button disabled={!p.isOnline} className="bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 gap-2 disabled:opacity-40">
                  <Phone className="h-4 w-4" /> {p.isOnline ? 'Call Now' : 'Offline'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        {p.certifications.length > 0 && (
          <Card className="bg-white border border-yellow-100 shadow-sm">
            <CardContent className="p-5">
              <h2 className="font-semibold text-[#1a1a1a] mb-3">Certifications</h2>
              <div className="flex flex-wrap gap-2">
                {p.certifications.map((c) => (
                  <Badge key={c} variant="outline" className="border-yellow-300 text-[#d97706] bg-yellow-50">{c}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        {p.reviews.length > 0 && (
          <div>
            <h2 className="font-semibold text-[#1a1a1a] mb-3">Reviews ({p.reviewCount})</h2>
            <div className="space-y-3">
              {p.reviews.map((r) => (
                <Card key={r.id} className="bg-white border border-yellow-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm text-[#1a1a1a]">{r.user.name || 'Anonymous'}</p>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-gray-500">{r.comment}</p>}
                    <p className="text-xs text-gray-400 mt-2">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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
