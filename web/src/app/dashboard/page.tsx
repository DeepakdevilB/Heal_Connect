'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wallet, MessageCircle, Phone, Star, Bell, LogOut,
  Search, ChevronRight, Zap, TrendingUp, Clock, Shield, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authApi, practitionersApi, tokenStore, type PractitionerProfile } from '@/lib/api';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  isEmailVerified: boolean;
}

const GRADIENTS = [
  'from-yellow-400 to-orange-500', 'from-emerald-400 to-teal-500',
  'from-pink-400 to-rose-500', 'from-blue-400 to-indigo-500',
  'from-purple-400 to-violet-500', 'from-cyan-400 to-blue-500',
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [experts, setExperts] = useState<Practitioner[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'astrology' | 'tarot' | 'vastu' | 'numerology'>('all');

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) { router.replace('/login'); return; }
    authApi.me(token).then((res) => {
      if (!res.success) { tokenStore.clear(); router.replace('/login'); return; }
      setUser((res.data as { user: UserData }).user);
    }).catch(() => { tokenStore.clear(); router.replace('/login'); })
      .finally(() => setLoading(false));

    practitionersApi.list({ limit: 6 }).then((res) => {
      if (res.success && res.data) {
        setExperts(res.data.practitioners);
        setOnlineCount(res.data.practitioners.filter((p) => p.isOnline).length);
      }
    });
  }, [router]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const specialty = tab !== 'all' ? tab : undefined;
    practitionersApi.list({ limit: 6, ...(specialty ? { specialty } : {}) }).then((res) => {
      if (res.success && res.data) setExperts(res.data.practitioners);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image src="/logo.png" alt="HealConnect" width={48} height={48} className="rounded-full animate-pulse" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">

      {/* Top Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-yellow-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
            <span className="text-xl font-extrabold text-[#f59e0b]">HealConnect</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search experts, specialties..." className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-yellow-50 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/40 text-[#1a1a1a] placeholder:text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-yellow-50">
              <Bell className="h-5 w-5 text-gray-500" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#f59e0b] rounded-full" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1.5">
              <Wallet className="h-4 w-4 text-[#f59e0b]" />
              <span className="text-sm font-semibold text-[#d97706]">₹0.00</span>
            </div>
            <Link href="/dashboard/profile" className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity" title="My Profile">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">

        {/* Welcome Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#f59e0b] to-[#ef4444] p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Welcome back 👋</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Hello, {firstName}!</h1>
              <p className="text-yellow-100 max-w-md">Your first session is free. Connect with a verified expert and start your healing journey today.</p>
              {!user?.isEmailVerified && (
                <div className="mt-3 flex items-center gap-2 text-white text-sm bg-white/20 border border-white/30 rounded-lg px-3 py-2 w-fit">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  Please verify your email to unlock all features.
                </div>
              )}
            </div>
            <Button className="bg-white text-[#d97706] hover:bg-yellow-50 border-0 rounded-full px-6 shrink-0 font-bold shadow-lg">
              <Zap className="h-4 w-4 mr-2" /> Start Free Session
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Wallet Balance', value: '₹0', icon: Wallet, color: 'text-[#f59e0b]', bg: 'bg-yellow-50' },
            { label: 'Sessions Done', value: '0', icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Minutes Used', value: '0 min', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' },
            { label: 'Experts Online', value: String(onlineCount || '—'), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-white border border-yellow-100 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1a1a1a]">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, label: 'Live Chat', desc: 'Text with an expert now', color: 'text-[#f59e0b]', bg: 'bg-yellow-50', border: 'hover:border-yellow-400' },
            { icon: Phone, label: 'Audio Call', desc: 'Voice consultation', color: 'text-orange-500', bg: 'bg-orange-50', border: 'hover:border-orange-400' },
            { icon: Wallet, label: 'Add Money', desc: 'Recharge your wallet', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'hover:border-emerald-400' },
          ].map((item) => (
            <Card key={item.label} className={`bg-white border border-yellow-100 ${item.border} transition-colors cursor-pointer group shadow-sm`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1a1a1a]">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#f59e0b] transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Experts Section */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-[#1a1a1a]">Browse Experts</h2>
              <p className="text-sm text-gray-500">500+ verified practitioners online</p>
            </div>
            <Button variant="ghost" className="text-[#f59e0b] hover:text-[#d97706] text-sm">
              See all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {(['all', 'astrology', 'tarot', 'vastu', 'numerology'] as const).map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#f59e0b] text-white' : 'bg-yellow-50 text-gray-600 hover:text-[#1a1a1a] border border-yellow-200'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {experts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Image src="/logo.png" alt="" width={40} height={40} className="mx-auto mb-2 opacity-30 rounded-full" />
              <p>No practitioners found. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experts.map((expert) => {
                const gradient = GRADIENTS[expert.name.charCodeAt(0) % GRADIENTS.length];
                const initials = expert.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <Link key={expert.id} href={`/practitioners/${expert.id}`}>
                    <Card className="bg-white border border-yellow-100 hover:border-yellow-300 hover:shadow-md transition-all cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            {expert.photoUrl ? (
                              <img src={expert.photoUrl} alt={expert.name} className="w-14 h-14 rounded-full object-cover shadow" />
                            ) : (
                              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shadow`}>{initials}</div>
                            )}
                            {expert.isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-[#1a1a1a] truncate">{expert.name}</p>
                              <Badge variant="outline" className={`text-xs shrink-0 ml-2 ${expert.isOnline ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-gray-200 text-gray-400'}`}>
                                {expert.isOnline ? '● Online' : 'Offline'}
                              </Badge>
                            </div>
                            <p className="text-sm text-[#f59e0b] font-medium truncate">{expert.specialties.slice(0, 2).join(' · ')}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium text-[#1a1a1a]">{expert.avgRating || '—'}</span>
                              <span className="text-xs text-gray-400">({expert.reviewCount})</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-yellow-100">
                          <div>
                            <span className="text-lg font-bold text-[#1a1a1a]">₹{expert.perMinuteRate}</span>
                            <span className="text-xs text-gray-400">/min</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 px-3 border-yellow-200 hover:border-yellow-400 hover:text-[#d97706]" onClick={(e) => e.preventDefault()}>
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" disabled={!expert.isOnline} className="h-8 px-3 bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 disabled:opacity-40" onClick={(e) => e.preventDefault()}>
                              <Phone className="h-3.5 w-3.5 mr-1" /> Call
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recharge CTA */}
        <Card className="bg-gradient-to-r from-[#fef3c7] to-white border border-yellow-200 shadow-sm">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-[#1a1a1a] mb-1">Top up your wallet</CardTitle>
              <CardDescription className="text-gray-500">Add money and start connecting with experts instantly. No hidden fees.</CardDescription>
            </div>
            <Button className="bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 rounded-full px-8 shrink-0 font-bold">
              <Wallet className="h-4 w-4 mr-2" /> Add ₹100
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-4">
          <Button variant="ghost" onClick={() => { tokenStore.clear(); router.push('/login'); }} className="text-gray-400 hover:text-red-500 gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </main>
    </div>
  );
}
