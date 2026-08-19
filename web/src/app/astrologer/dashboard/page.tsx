'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore, type AstrologerOnboardingProfile } from '@/lib/api';
import { Loader2, Star, Phone, LogOut, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AstrologerDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AstrologerOnboardingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    astrologerApi.getDashboard(token).then((res) => {
      if (res.success && res.data) setProfile(res.data.dashboard);
      else router.replace('/astrologer/login');
    }).catch(() => router.replace('/astrologer/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleToggleOnline = async () => {
    const token = astrologerTokenStore.getAccess();
    if (!token || !profile) return;
    setToggling(true);
    const res = await astrologerApi.updateAvailability(token, { isOnline: !profile.isOnline });
    if (res.success && res.data) setProfile((p) => p ? { ...p, isOnline: !p.isOnline } : p);
    setToggling(false);
  };

  const handleLogout = () => {
    astrologerTokenStore.clear();
    router.replace('/astrologer/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {profile.profilePhotoUrl ? (
            <img src={profile.profilePhotoUrl} alt={profile.displayName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{profile.displayName || 'Astrologer'}</p>
            <p className="text-xs text-gray-500 capitalize">{profile.accountStatus.toLowerCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleOnline}
            disabled={toggling}
            className="flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            {profile.isOnline
              ? <ToggleRight className="w-6 h-6 text-green-500" />
              : <ToggleLeft className="w-6 h-6 text-gray-400" />}
            {profile.isOnline ? 'Online' : 'Offline'}
          </button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Rating', value: profile.avgRating?.toFixed(1) ?? '0.0' },
            { label: 'Reviews', value: profile.reviewCount ?? 0 },
            { label: 'Consultations', value: profile.totalConsultations ?? 0 },
            { label: 'Earnings (₹)', value: profile.totalEarnings?.toFixed(0) ?? '0' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Chat / min</p>
              <p className="text-xl font-bold text-amber-600">₹{profile.chatPricePerMin}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Call / min</p>
              <p className="text-xl font-bold text-amber-600">₹{profile.callPricePerMin}</p>
            </div>
          </div>
        </div>

        {/* Specializations */}
        {profile.specializations?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Specializations</h2>
            <div className="flex flex-wrap gap-2">
              {profile.specializations.map((s) => (
                <span key={s} className="bg-amber-100 text-amber-700 text-sm px-3 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Contact support */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-3 text-sm text-gray-600">
          <Phone className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Need help? Contact support at <strong>support@healconnect.in</strong></span>
        </div>
      </main>
    </div>
  );
}
