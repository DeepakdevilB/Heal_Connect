'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { tokenStore, sessionsApi, practitionersApi, type PractitionerProfile } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  MessageCircle, LogOut, Wifi, WifiOff, User, Clock,
  IndianRupee, Star, TrendingUp, Bell, ChevronRight,
  Sparkles, HeartHandshake, Phone, Activity, Loader2, FileText, LifeBuoy
} from 'lucide-react';

interface ActiveSession {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; photoUrl: string | null };
}

export default function ExpertDashboardPage() {
  const router = useRouter();
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PractitionerProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [sessionsDone, setSessionsDone] = useState(0);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const fetchSessions = useCallback(() => {
    const token = tokenStore.getAccess();
    if (!token) return;
    sessionsApi.practitionerActive(token).then((res) => {
      if (res.success && res.data) setSessions(res.data.sessions);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node))
        setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = tokenStore.getAccess();
    const role = localStorage.getItem('hc_role');
    const pid = localStorage.getItem('hc_practitioner_id') || localStorage.getItem('hc_pid');

    if (!token || role !== 'practitioner' || !pid) {
      router.replace('/login?role=expert');
      return;
    }

    // Verify the token actually has practitionerId embedded
    try {
      const jwtPayload = JSON.parse(atob(token.split('.')[1]));
      if (!jwtPayload.practitionerId) {
        // Token is a user token, not a practitioner token — force re-login
        tokenStore.clear();
        localStorage.removeItem('hc_role');
        localStorage.removeItem('hc_practitioner_id');
        localStorage.removeItem('hc_pid');
        router.replace('/login?role=expert');
        return;
      }
    } catch {
      router.replace('/login?role=expert');
      return;
    }

    setPractitionerId(pid);

    practitionersApi.get(pid).then((res) => {
      if (res.success && res.data) {
        setProfile(res.data.practitioner);
        setIsOnline(res.data.practitioner.isOnline);
        setIsBusy(res.data.practitioner.isBusy ?? false);
      }
    });

    fetchSessions();

    sessionsApi.practitionerHistory(token).then((res) => {
      if (res.success && res.data) {
        setTotalEarnings(res.data.totalEarnings);
        setSessionsDone(res.data.sessions.length);
      }
    });

    const socket = getSocket(token);
    socket.on('new_session_request', (data: ActiveSession) => {
      setSessions((prev) => prev.find((s) => s.id === data.id) ? prev : [data, ...prev]);
      // Immediately refresh from server to ensure accuracy
      fetchSessions();
    });
    
    socket.on('session_terminated', ({ sessionId }: { sessionId: string }) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    });

    // Poll every 10s to catch any missed socket events
    const poll = setInterval(fetchSessions, 10000);
    return () => {
      clearInterval(poll);
      socket.off('new_session_request');
      socket.off('session_terminated');
    };
  }, [router, fetchSessions]);

  const toggleOnline = async () => {
    const token = tokenStore.getAccess();
    if (!token || !practitionerId) return;
    setTogglingOnline(true);
    const next = !isOnline;
    await practitionersApi.setAvailability(token, practitionerId, next);
    setIsOnline(next);
    setTogglingOnline(false);
  };

  const handleLogout = () => {
    disconnectSocket();
    tokenStore.clear();
    localStorage.removeItem('hc_role');
    localStorage.removeItem('hc_practitioner_id');
    localStorage.removeItem('hc_practitioner_name');
    router.push('/expert/login');
  };

  const firstName = profile?.name?.split(' ')[0] || 'Expert';
  const initials = profile?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'E';

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-amber-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
            <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
            <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <Sparkles className="w-3 h-3" /> Expert
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Session Requests Link */}
            <Link href="/expert/requests" className="relative p-2 text-amber-600 hover:bg-amber-50 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              {/* Optional: You could add a red dot here if there are pending requests */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </Link>

            {/* Online toggle */}
            <button
              onClick={toggleOnline}
              disabled={togglingOnline}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {isOnline ? 'Online' : 'Go Online'}
            </button>

            {/* Profile menu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold hover:opacity-90 transition-opacity overflow-hidden"
              >
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  : initials}
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-amber-100 rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{profile?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{profile?.specialties?.[0] || 'Expert'}</p>
                  </div>
                  <Link href="/expert/profile" onClick={() => setShowProfileMenu(false)} className="w-full px-4 py-3 hover:bg-amber-50 transition-colors flex items-center gap-3">
                    <User className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">My Profile</span>
                  </Link>
                  <Link href="/expert/transcripts" onClick={() => setShowProfileMenu(false)} className="w-full px-4 py-3 hover:bg-amber-50 transition-colors flex items-center gap-3">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">Call Transcripts</span>
                  </Link>
                  <Link href="/expert/support" onClick={() => setShowProfileMenu(false)} className="w-full px-4 py-3 hover:bg-amber-50 transition-colors flex items-center gap-3">
                    <LifeBuoy className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-700">Support</span>
                  </Link>
                  <button onClick={handleLogout} className="w-full px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-600">Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 space-y-6">

        {/* ── Welcome Banner ── */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-extrabold overflow-hidden shrink-0">
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div>
                <div className="flex items-center gap-2 text-amber-100 text-sm font-medium mb-1">
                  <HeartHandshake className="w-4 h-4" />
                  <span>Expert Dashboard</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white">Hello, {firstName}!</h1>
                <p className="text-amber-100 text-sm mt-1">
                  {profile?.specialties?.slice(0, 2).join(' · ') || 'Wellness Expert'} · ₹{profile?.perMinuteRate}/min
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                isBusy ? 'bg-orange-500 text-white shadow-orange-500/30' :
                isOnline ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-white/20 text-white shadow-black/10'
              }`}>
                {isBusy ? <Activity className="w-4 h-4 animate-pulse" /> : isOnline ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
                {isBusy ? 'Busy (In Session)' : isOnline ? 'Accepting Sessions' : 'Currently Offline'}
              </div>
              <Button
                onClick={toggleOnline}
                disabled={togglingOnline || isBusy}
                size="lg"
                className={`rounded-2xl font-extrabold shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${
                  isOnline 
                    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' 
                    : 'bg-white text-orange-600 hover:bg-orange-50 border-0'
                }`}
              >
                {togglingOnline ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : isOnline ? (
                  <WifiOff className="w-5 h-5 mr-2" />
                ) : (
                  <Wifi className="w-5 h-5 mr-2" />
                )}
                {isOnline ? 'Go Offline' : 'Go Online Now'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Earnings', value: `₹${totalEarnings.toFixed(2)}`, icon: IndianRupee, color: 'text-amber-500', bg: 'bg-amber-50' },
            { label: 'Sessions Done', value: String(sessionsDone), icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Avg Rating', value: profile?.avgRating ? String(profile.avgRating) : '—', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
            { label: 'Active Now', value: sessions.length > 0 ? String(sessions.length) : '0', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
          ].map((stat) => (
            <Card key={stat.label} className="bg-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 rounded-2xl">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
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

        <div className="grid md:grid-cols-3 gap-6">

          {/* ── Active Sessions (left 2/3) ── */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-0.5">Incoming</p>
                <h2 className="text-xl font-extrabold text-gray-900">Active Sessions</h2>
              </div>
              {sessions.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {sessions.length} waiting
                </span>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-amber-200 p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-amber-300" />
                </div>
                <p className="font-semibold text-gray-700 mb-1">No active sessions</p>
                <p className="text-sm text-gray-400">
                  {isOnline ? 'Waiting for users to connect...' : 'Go online to start receiving sessions'}
                </p>
                {!isOnline && (
                  <button
                    onClick={toggleOnline}
                    className="mt-4 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors"
                  >
                    <Wifi className="w-4 h-4" /> Go Online Now
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl border border-amber-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-amber-200 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden">
                      {session.user.photoUrl
                        ? <img src={session.user.photoUrl} alt={session.user.name ?? ''} className="w-full h-full object-cover" />
                        : <User className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{session.user.name ?? 'Anonymous User'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          session.type === 'CHAT' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {session.type === 'CHAT' ? <MessageCircle className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                          {session.type}
                        </span>
                        <span className="text-gray-300">·</span>
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        const token = tokenStore.getAccess();
                        if (token) await sessionsApi.accept(token, session.id).catch(console.error);
                        router.push(`/session/${session.id}`);
                      }}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-full px-5 font-semibold shrink-0"
                    >
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Profile Card (right 1/3) ── */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-0.5">Your Profile</p>
              <h2 className="text-xl font-extrabold text-gray-900">Overview</h2>
            </div>

            <Card className="bg-white border-0 shadow-md rounded-2xl overflow-hidden">
              <div className="h-16 bg-gradient-to-r from-amber-400 to-orange-400" />
              <CardContent className="px-5 pb-5 -mt-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 border-4 border-white flex items-center justify-center text-white text-xl font-extrabold overflow-hidden shadow-md mb-3">
                  {profile?.photoUrl
                    ? <img src={profile.photoUrl} alt={profile?.name} className="w-full h-full object-cover" />
                    : initials}
                </div>
                <p className="font-bold text-gray-900 text-base">{profile?.name}</p>
                <p className="text-sm text-amber-600 font-medium mb-3">{profile?.specialties?.slice(0, 2).join(' · ') || '—'}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-500">Status</span>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isBusy ? 'bg-orange-100 text-orange-700' :
                      isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isBusy ? 'bg-orange-500' : isOnline ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {isBusy ? 'Busy' : isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

              </CardContent>
            </Card>


          </div>
        </div>
      </main>
    </div>
  );
}
