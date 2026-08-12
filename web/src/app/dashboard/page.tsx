'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wallet, MessageCircle, Phone, Star, Bell, LogOut,
  Search, ChevronRight, Zap, TrendingUp, Clock, Shield, User,
  HeartHandshake, Headphones, Sparkles, ArrowRight,
  Waves, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { authApi, practitionersApi, walletApi, sessionsApi, tokenStore, type PractitionerProfile } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { RechargeModal } from '@/components/wallet/RechargeModal';
import { getPractitionerAvatar } from '@/lib/utils';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  isEmailVerified: boolean;
  photoUrl?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [experts, setExperts] = useState<PractitionerProfile[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'astrology' | 'tarot' | 'vastu' | 'numerology'>('all');
  
  // Wallet State
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
  const [startingSession, setStartingSession] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotification(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      router.push(`/practitioners?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const startChatSession = async (practitionerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const token = tokenStore.getAccess();
    if (!token) { router.push('/login'); return; }
    setStartingSession(practitionerId);
    const res = await sessionsApi.create(token, practitionerId, 'CHAT');
    setStartingSession(null);
    if (res.success && res.data) {
      router.push(`/session/${res.data.session.id}`);
    } else {
      alert(res.message || 'Could not start session. Please recharge your wallet.');
    }
  };

  const fetchWallet = () => {
    const token = tokenStore.getAccess();
    if (token) {
      walletApi.getBalance(token).then((res) => {
        if (res.success && res.data) setWalletBalance(res.data.wallet.balance);
      });
    }
  };

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) { router.replace('/login'); return; }

    // Redirect experts to their own dashboard
    if (localStorage.getItem('hc_role') === 'practitioner') {
      router.replace('/expert/dashboard');
      return;
    }

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

    fetchWallet();

    // Real-time expert online/offline updates
    const socket = getSocket(token);
    socket.on('practitioner_status', ({ practitionerId, isOnline }: { practitionerId: string; isOnline: boolean }) => {
      setExperts((prev) => prev.map((e) => e.id === practitionerId ? { ...e, isOnline } : e));
      setOnlineCount((prev) => {
        // recalculate from updated list
        return prev; // will be recalculated below
      });
      setExperts((prev) => {
        const updated = prev.map((e) => e.id === practitionerId ? { ...e, isOnline } : e);
        setOnlineCount(updated.filter((e) => e.isOnline).length);
        return updated;
      });
    });

    return () => { socket.off('practitioner_status'); };
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
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image src="/logo.png" alt="HealConnect" width={48} height={48} className="rounded-full animate-pulse" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">

      {/* Top Nav */}
      <header className="sticky top-0 z-50 w-full border-b border-amber-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
            <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search experts, specialties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-amber-50 border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 text-[#1a1a1a] placeholder:text-gray-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationRef}>
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-amber-50" onClick={() => setShowNotification(!showNotification)}>
                <Bell className="h-5 w-5 text-gray-500" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
              </Button>
              {showNotification && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-amber-100 rounded-2xl shadow-xl overflow-hidden z-50" onClick={() => setShowNotification(false)}>
                  <div className="p-4 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">Notifications</p>
                  </div>
                  <div className="p-4 text-center text-gray-400 text-sm py-8">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No new notifications
                  </div>
                </div>
              )}
            </div>
            <Link href="/dashboard/wallet">
              <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 cursor-pointer hover:bg-amber-100 transition-colors">
                <Wallet className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">
                  {walletBalance !== null ? `₹${walletBalance.toFixed(2)}` : '...'}
                </span>
              </div>
            </Link>
            <div className="relative" ref={profileMenuRef}>
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity overflow-hidden" title="My Profile">
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name || 'Profile'} className="w-full h-full object-cover" />
                ) : user?.name ? (
                  user.name.charAt(0).toUpperCase()
                ) : (
                  <User className="h-4 w-4" />
                )}
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-amber-100 rounded-2xl shadow-xl overflow-hidden z-50">
                  <Link href="/dashboard/profile" onClick={() => setShowProfileMenu(false)}>
                    <div className="px-4 py-3 hover:bg-amber-50 transition-colors flex items-center gap-3 border-b border-gray-100">
                      <User className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium text-gray-900">My Profile</span>
                    </div>
                  </Link>
                  <button onClick={() => { tokenStore.clear(); router.push('/login'); }} className="w-full px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">

        {/* ═══ WELCOME BANNER ═══ */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-100 text-sm font-medium mb-2">
                <HeartHandshake className="w-4 h-4" />
                <span>Welcome back</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Hello, {firstName}!</h1>
              <p className="text-amber-100 max-w-md flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Your first session is free. Connect with a verified expert and start your healing journey today.</span>
              </p>
              {!user?.isEmailVerified && (
                <div className="mt-3 flex items-center gap-2 text-white text-sm bg-white/20 border border-white/30 rounded-lg px-3 py-2 w-fit">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  Please verify your email to unlock all features.
                </div>
              )}
            </div>
            <Link href="/practitioners">
              <Button className="bg-white text-amber-700 hover:bg-amber-50 border-0 rounded-full px-6 shrink-0 font-bold shadow-lg shadow-amber-900/20">
                <Zap className="h-4 w-4 mr-2" /> Start Free Session
              </Button>
            </Link>
          </div>
        </div>

        {/* ═══ STATS ROW ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Wallet Balance', value: walletBalance !== null ? `₹${walletBalance.toFixed(2)}` : '...', icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-50', shadow: 'shadow-amber-200/30' },
            { label: 'Sessions Done', value: '0', icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', shadow: 'shadow-emerald-200/30' },
            { label: 'Minutes Used', value: '0 min', icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50', shadow: 'shadow-orange-200/30' },
            { label: 'Experts Online', value: onlineCount > 0 ? String(onlineCount) : '—', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', shadow: 'shadow-blue-200/30' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ QUICK ACTIONS ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, label: 'Live Chat', desc: 'Text with an expert now', color: 'text-amber-500', bg: 'bg-amber-50', border: 'hover:border-amber-400', action: () => document.getElementById('experts-section')?.scrollIntoView({ behavior: 'smooth' }) },
            { icon: Headphones, label: 'Audio Call', desc: 'Voice consultation', color: 'text-orange-500', bg: 'bg-orange-50', border: 'hover:border-orange-400', action: () => document.getElementById('experts-section')?.scrollIntoView({ behavior: 'smooth' }) },
            { icon: Wallet, label: 'Add Money', desc: 'Recharge your wallet', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'hover:border-emerald-400', action: () => setIsRechargeModalOpen(true) },
          ].map((item) => (
            <Card key={item.label} onClick={item.action} className={`bg-white border border-gray-100 ${item.border} transition-all duration-300 cursor-pointer group shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-2xl overflow-hidden`}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ═══ EXPERTS SECTION ═══ */}
        <div id="experts-section">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">Browse Experts</p>
              <h2 className="text-2xl font-extrabold text-gray-900">Find Your Healer</h2>
              <p className="text-sm text-gray-500">500+ verified practitioners online</p>
            </div>
            <Link href="/practitioners">
              <Button variant="ghost" className="text-amber-600 hover:text-amber-700 text-sm font-semibold">
                See all <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {(['all', 'astrology', 'tarot', 'vastu', 'numerology'] as const).map((tab) => (
              <button key={tab} onClick={() => handleTabChange(tab)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? 'bg-amber-500 text-white shadow-sm' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-amber-200'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {experts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Image src="/logo.png" alt="" width={48} height={48} className="mx-auto mb-3 opacity-30 rounded-full" />
              <p className="text-lg font-medium">No practitioners found</p>
              <p className="text-sm mt-1">Check back soon or try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {experts.map((expert) => {
                const avatarSrc = getPractitionerAvatar(expert.photoUrl, expert.id);
                return (
                  <Link key={expert.id} href={`/practitioners/${expert.id}`} className="h-full">
                    <Card className="bg-white border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer rounded-2xl overflow-hidden group h-full">
                      <CardContent className="p-0 flex flex-col h-full">
                        {/* Top strip with avatar */}
                        <div className="relative h-14 bg-gradient-to-r from-amber-50 to-orange-50">
                          <div className="absolute -bottom-6 left-5">
                            <img src={avatarSrc} alt={expert.name} className="w-12 h-12 rounded-xl object-cover shadow-md border-2 border-white" />
                          </div>
                          <div className="absolute top-3 right-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              expert.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${expert.isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                              {expert.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="pt-8 px-5 pb-5 flex flex-col flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <p className="font-bold text-gray-900 text-base">{expert.name}</p>
                              <p className="text-sm text-amber-600 font-medium">{expert.specialties.slice(0, 2).join(' · ') || '—'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-2 mb-3">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                              <span className="text-sm font-semibold text-gray-900">{expert.avgRating || '—'}</span>
                              <span className="text-xs text-gray-400">({expert.reviewCount})</span>
                            </div>
                            <span className="text-gray-200">|</span>
                            <span className="text-xs text-gray-500">{expert.experienceYrs} yrs exp</span>
                          </div>

                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">{expert.bio || ''}</p>

                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                            <div>
                              <span className="text-lg font-bold text-gray-900">₹{expert.perMinuteRate}</span>
                              <span className="text-xs text-gray-400">/min</span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 px-3 border-gray-200 hover:border-amber-300 hover:text-amber-700 text-xs gap-1" onClick={(e) => { e.preventDefault(); startChatSession(expert.id, e); }} disabled={startingSession === expert.id}>
                                <MessageCircle className="h-3.5 w-3.5" /> Chat
                              </Button>
                              <Button size="sm" disabled={!expert.isOnline} className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white border-0 text-xs gap-1 disabled:opacity-40" onClick={(e) => e.preventDefault()}>
                                <Phone className="h-3.5 w-3.5" /> Call
                              </Button>
                            </div>
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

        {/* ═══ RECHARGE CTA ═══ */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white mb-1">Top up your wallet</h3>
                <p className="text-amber-100 text-sm max-w-md">Add money and start connecting with experts instantly. No hidden fees.</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-amber-100 text-xs">
                    <Check className="w-3.5 h-3.5" /> Secure payments
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-100 text-xs">
                    <Check className="w-3.5 h-3.5" /> Instant recharge
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-100 text-xs">
                    <Check className="w-3.5 h-3.5" /> No expiry
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setIsRechargeModalOpen(true)}
              className="bg-white text-amber-700 hover:bg-amber-50 border-0 rounded-full px-8 shrink-0 font-bold shadow-lg shadow-amber-900/20 whitespace-nowrap"
            >
              <Waves className="h-4 w-4 mr-2" /> Add Funds
            </Button>
          </div>
        </div>

      </main>

      <RechargeModal 
        isOpen={isRechargeModalOpen} 
        onClose={() => setIsRechargeModalOpen(false)} 
        onSuccess={() => {
          fetchWallet();
          // Adding a slight delay fetch to ensure webhook has updated DB
          setTimeout(fetchWallet, 2000);
        }} 
      />
    </div>
  );
}
