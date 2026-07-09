'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Camera, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { usersApi, tokenStore } from '@/lib/api';

const WELLNESS_OPTIONS = [
  'Astrology', 'Tarot', 'Reiki', 'Vastu', 'Numerology',
  'Meditation', 'Crystal Healing', 'Palmistry', 'Energy Healing', 'Chakra Balancing',
];

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
      setForm({
        name: u.name || '',
        dob: u.dob ? u.dob.split('T')[0] : '',
        birthPlace: u.birthPlace || '',
        gender: u.gender || '',
        phone: u.phone || '',
      });
      setInterests(u.wellnessInterests || []);
    });
  }, [router]);

  const handleSave = async () => {
    const token = tokenStore.getAccess();
    if (!token) return;
    setSaving(true);
    setError('');
    const res = await usersApi.updateProfile(token, {
      name: form.name || undefined,
      dob: form.dob ? form.dob : undefined,
      birthPlace: form.birthPlace || undefined,
      gender: form.gender || undefined,
      phone: form.phone || undefined,
      wellnessInterests: interests,
    });
    setSaving(false);
    if (res.success && res.data) {
      setProfile(res.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setError(res.message || 'Failed to save');
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = tokenStore.getAccess();
    if (!token) return;
    setUploading(true);
    const res = await usersApi.uploadPhoto(token, file);
    setUploading(false);
    if (res.success && res.data) {
      setProfile((p) => p ? { ...p, photoUrl: res.data!.photoUrl } : p);
    }
  };

  const toggleInterest = (i: string) =>
    setInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const initials = (profile.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">HealConnect</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <h1 className="text-2xl font-extrabold">My Profile</h1>

        {/* Photo */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="relative shrink-0">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name || ''} className="w-20 h-20 rounded-full object-cover shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center text-white shadow transition-colors"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile.name || 'Your Name'}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              {profile.isEmailVerified && (
                <Badge variant="outline" className="mt-1 text-xs border-cyan-500/30 text-cyan-400 bg-cyan-500/10">✓ Verified</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Full Name">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
                className="input-style"
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 9876543210"
                className="input-style"
              />
            </Field>
            <Field label="Date of Birth">
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="input-style"
              />
            </Field>
            <Field label="Birth Place">
              <input
                value={form.birthPlace}
                onChange={(e) => setForm((f) => ({ ...f, birthPlace: e.target.value }))}
                placeholder="City, Country"
                className="input-style"
              />
            </Field>
            <Field label="Gender">
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="input-style"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </Field>
          </CardContent>
        </Card>

        {/* Wellness Interests */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Wellness Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {WELLNESS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => toggleInterest(opt)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    interests.includes(opt)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-muted text-muted-foreground border-border hover:border-indigo-500/50 hover:text-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <X className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-full h-11"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <Check className="h-4 w-4 mr-2" /> : null}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
