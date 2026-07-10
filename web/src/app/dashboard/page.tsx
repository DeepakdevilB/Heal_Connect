'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles, Wallet, MessageCircle, Phone, Star, Bell, LogOut,
  Search, ChevronRight, Zap, TrendingUp, Clock, Shield, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { authApi, practitionersApi, tokenStore } from '@/lib/api';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  isEmailVerified: boolean;
}

interface Practitioner {
  id: string;
  name: string;
  specialties: string[];
  perMinuteRate: number;
  photoUrl: string | null;
  isOnline: boolean;
  avgRating: number;
  reviewCount: number;
}

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

    const specialty = activeTab !== 'all' ? activeTab : undefined;
    practitionersApi.list({ limit: 6, ...(specialty ? { specialty } : {}) }).then((res) => {
      if (res.success && res.data) {
        setExperts(res.data.practitioners);
        setOnlineCount(res.data.practitioners.filter((p) => p.isOnline).length);
      }
    });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    const specialty = tab !== 'all' ? tab : undefined;
    practitionersApi.list({ limit: 6, ...(specialty ? { specialty } : {}) }).then((res) => {
      if (res.success && res.data) setExperts(res.data.practitioners);
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">

      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">HealConnect</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search experts, specialties..." className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-foreground placeholder:text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5">
              <Wallet className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-300">₹0.00</span>
            </div>
            <Link href="/dashboard/profile" className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity" title="My Profile">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">

        {/* ── Welcome Banner ── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-300 text-sm font-medium mb-1">Welcome back 👋</p>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Hello, {firstName}!</h1>
              <p className="text-muted-foreground max-w-md">Your first session is free. Connect with a verified expert and start your healing journey today.</p>
              {!user?.isEmailVerified && (
                <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 w-fit">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  Please verify your email to unlock all features.
                </div>
              )}
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-full px-6 shrink-0 shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)]">
              <Zap className="h-4 w-4 mr-2" /> Start Free Session
            </Button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Wallet Balance', value: '₹0', icon: Wallet, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { label: 'Sessions Done', value: '0', icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Minutes Used', value: '0 min', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Experts Online', value: String(onlineCount || '—'), icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, label: 'Live Chat', desc: 'Text with an expert now', color: 'text-indigo-400', bg: 'bg-indigo-500/10', hover: 'hover:border-indigo-500/40' },
            { icon: Phone, label: 'Audio Call', desc: 'Voice consultation', color: 'text-purple-400', bg: 'bg-purple-500/10', hover: 'hover:border-purple-500/40' },
            { icon: Wallet, label: 'Add Money', desc: 'Recharge your wallet', color: 'text-cyan-400', bg: 'bg-cyan-500/10', hover: 'hover:border-cyan-500/40' },
          ].map((item) => (
            <Card key={item.label} className={`bg-card border-border ${item.hover} transition-colors cursor-pointer group`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center group-hover:opacity-80 transition-opacity`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground group-hover:${item.color} transition-colors`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Experts Section ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Browse Experts</h2>
              <p className="text-sm text-muted-foreground">500+ verified practitioners online</p>
            </div>
            <Button variant="ghost" className="text-indigo-400 hover:text-indigo-300 text-sm">
              See all <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {(['all', 'astrology', 'tarot', 'vastu', 'numerology'] as const).map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {experts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No practitioners found. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experts.map((expert) => {
                const gradients = ['from-indigo-500 to-purple-600', 'from-emerald-500 to-teal-600', 'from-cyan-500 to-blue-600', 'from-pink-500 to-rose-600', 'from-amber-500 to-orange-600', 'from-violet-500 to-purple-600'];
                const gradient = gradients[expert.name.charCodeAt(0) % gradients.length];
                const initials = expert.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <Link key={expert.id} href={`/practitioners/${expert.id}`}>
                    <Card className="bg-card border-border hover:border-indigo-500/30 transition-all group cursor-pointer">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            {expert.photoUrl ? (
                              <img src={expert.photoUrl} alt={expert.name} className="w-14 h-14 rounded-full object-cover shadow-lg" />
                            ) : (
                              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shadow-lg`}>{initials}</div>
                            )}
                            {expert.isOnline && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-card rounded-full" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-foreground truncate">{expert.name}</p>
                              <Badge variant="outline" className={`text-xs shrink-0 ml-2 ${expert.isOnline ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-border text-muted-foreground'}`}>
                                {expert.isOnline ? '● Online' : 'Offline'}
                              </Badge>
                            </div>
                            <p className="text-sm text-indigo-400 font-medium truncate">{expert.specialties.slice(0, 2).join(' · ')}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                              <span className="text-sm font-medium text-foreground">{expert.avgRating || '—'}</span>
                              <span className="text-xs text-muted-foreground">({expert.reviewCount})</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                          <div>
                            <span className="text-lg font-bold text-foreground">₹{expert.perMinuteRate}</span>
                            <span className="text-xs text-muted-foreground">/min</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8 px-3 border-border hover:border-indigo-500/50 hover:text-indigo-400" onClick={(e) => e.preventDefault()}>
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" disabled={!expert.isOnline} className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white border-0 disabled:opacity-40" onClick={(e) => e.preventDefault()}>
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

        {/* ── Recharge CTA ── */}
        <Card className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-indigo-500/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-foreground mb-1">Top up your wallet</CardTitle>
              <CardDescription>Add money and start connecting with experts instantly. No hidden fees.</CardDescription>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-full px-8 shrink-0">
              <Wallet className="h-4 w-4 mr-2" /> Add ₹100
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-4">
          <Button variant="ghost" onClick={() => { tokenStore.clear(); router.push('/login'); }} className="text-muted-foreground hover:text-red-400 gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </main>
    </div>
  );
}
