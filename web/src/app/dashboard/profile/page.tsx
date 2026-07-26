'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Camera, Loader2, Check, X, User, Mail, Phone, MapPin, CalendarDays, Shield, Heart, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usersApi, tokenStore } from '@/lib/api';

const WELLNESS_OPTIONS = [
  'Astrology', 'Tarot', 'Reiki', 'Vastu', 'Numerology',
  'Meditation', 'Crystal Healing', 'Palmistry', 'Energy Healing', 'Chakra Balancing',
];

const INPUT_CLS = 'w-full text-sm rounded-lg bg-amber-50/70 border border-amber-200 px-4 py-2.5 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all';
const LABEL_CLS = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block';

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  dob: string | null;
  birthPlace: string | null;
  gender: string | null;
  wellnessInterests: string[];
  photoUrl: string | null;
  isEmailVerified: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState({ name: '', dob: '', birthPlace: '', gender: '', phone: '' });
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) { router.replace('/login'); return; }
    usersApi.getProfile(token).then((res) => {
      if (!res.success || !res.data) { router.replace('/login'); return; }
      const u = res.data.user;
      setProfile(u);
      setForm({ name: u.name || '', dob: u.dob ? u.dob.split('T')[0] : '', birthPlace: u.birthPlace || '', gender: u.gender || '', phone: u.phone || '' });
      setInterests(u.wellnessInterests || []);
    });
  }, [router]);

  const handleSave = async () => {
    const token = tokenStore.getAccess();
    if (!token) return;
    setSaving(true); setError('');
    const res = await usersApi.updateProfile(token, {
      name: form.name || undefined, dob: form.dob || undefined,
      birthPlace: form.birthPlace || undefined, gender: form.gender || undefined,
      phone: form.phone || undefined, wellnessInterests: interests,
    });
    setSaving(false);
    if (res.success && res.data) { setProfile(res.data.user); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    else setError(res.message || 'Failed to save');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = tokenStore.getAccess();
    if (!token) return;
    setUploading(true);
    const res = await usersApi.uploadPhoto(token, file);
    setUploading(false);
    if (res.success && res.data) setProfile((p) => p ? { ...p, photoUrl: res.data!.photoUrl } : p);
  };

  const toggleInterest = (i: string) =>
    setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Image src="/logo.png" alt="HealConnect" width={48} height={48} className="rounded-full animate-pulse" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const initials = (profile.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-amber-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-amber-500 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="font-extrabold text-amber-500">HealConnect</span>
          </Link>
          <div className="text-sm font-semibold text-gray-600">My Profile</div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-6">

        {/* ═══ PROFILE HEADER CARD ═══ */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 relative">
            <div className="absolute -bottom-12 left-6">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-white">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                    {initials}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
              </div>
            </div>
          </div>
          <div className="pt-16 px-6 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-extrabold text-gray-900">{profile.name || 'Your Name'}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{profile.email}</span>
                  {profile.isEmailVerified && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold gap-1 rounded-full px-2">
                      <Check className="w-3 h-3" /> Verified
                    </Badge>
                  )}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{profile.phone}</span>
                  </div>
                )}
              </div>
              {!profile.isEmailVerified && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 gap-1">
                  <Shield className="w-3 h-3" /> Verify Email
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* ═══ BASIC INFORMATION ═══ */}
        <Card className="bg-white border border-amber-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-amber-50">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 ml-7">Update your personal details</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Full Name */}
            <div>
              <label className={LABEL_CLS}><User className="w-3 h-3 inline mr-1 text-amber-500" /> Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                className={INPUT_CLS}
              />
            </div>

            {/* Phone + DOB Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}><Phone className="w-3 h-3 inline mr-1 text-amber-500" /> Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}><CalendarDays className="w-3 h-3 inline mr-1 text-amber-500" /> Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Birth Place + Gender Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}><MapPin className="w-3 h-3 inline mr-1 text-amber-500" /> Birth Place</label>
                <input
                  value={form.birthPlace}
                  onChange={(e) => setForm((f) => ({ ...f, birthPlace: e.target.value }))}
                  placeholder="City, Country"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}><Sun className="w-3 h-3 inline mr-1 text-amber-500" /> Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className={INPUT_CLS}
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══ WELLNESS INTERESTS ═══ */}
        <Card className="bg-white border border-amber-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-amber-50">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">Wellness Interests</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 ml-7">Select topics you care about</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2.5">
              {WELLNESS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleInterest(opt)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                    interests.includes(opt)
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-200'
                      : 'bg-white text-gray-600 border-amber-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ═══ ERROR / SAVE ═══ */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-5 py-3.5">
            <X className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-full h-12 font-bold shadow-lg shadow-amber-200 transition-all"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : saved ? (
              <><Check className="h-5 w-5 mr-2" /> Saved!</>
            ) : (
              'Save Changes'
            )}
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" className="border-amber-200 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-full h-12 px-6">
              Cancel
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
