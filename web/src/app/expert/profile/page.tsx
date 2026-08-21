'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Camera, Loader2, Check, X,
  User, Mail, Star, IndianRupee, BookOpen, Languages, Award,
  Download, ShieldAlert, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { practitionersApi, tokenStore } from '@/lib/api';

const SPECIALTIES = [
  'Astrology', 'Tarot', 'Reiki', 'Vastu', 'Numerology',
  'Meditation', 'Crystal Healing', 'Palmistry', 'Energy Healing', 'Chakra Balancing',
];
const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada'];

const INPUT_CLS = 'w-full text-sm rounded-lg bg-amber-50/70 border border-amber-200 px-4 py-2.5 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-all';
const LABEL_CLS = 'text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block';

interface ExpertProfile {
  id: string;
  name: string;
  email: string | null;
  bio: string | null;
  specialties: string[];
  certifications: string[];
  languages: string[];
  experienceYrs: number;
  perMinuteRate: number;
  photoUrl: string | null;
  isVerified: boolean;
  avgRating?: number;
  reviewCount?: number;
}

export default function ExpertProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [form, setForm] = useState({ name: '', bio: '', experienceYrs: '0', perMinuteRate: '0', certInput: '' });
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [practitionerId, setPractitionerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const token = tokenStore.getAccess();
    const role = localStorage.getItem('hc_role');
    const pid = localStorage.getItem('hc_practitioner_id') || localStorage.getItem('hc_pid');
    if (!token || role !== 'practitioner' || !pid) { router.replace('/login?role=expert'); return; }
    setPractitionerId(pid);
    practitionersApi.get(pid).then((res) => {
      if (!res.success || !res.data) { router.replace('/expert/login'); return; }
      const p = res.data.practitioner as ExpertProfile;
      setProfile(p);
      setForm({ name: p.name, bio: p.bio || '', experienceYrs: String(p.experienceYrs), perMinuteRate: String(p.perMinuteRate), certInput: '' });
      setSpecialties(p.specialties);
      setLanguages(p.languages);
      setCertifications(p.certifications);
    });
  }, [router]);

  const handleSave = async () => {
    const token = tokenStore.getAccess();
    if (!token || !practitionerId) return;
    setSaving(true); setError('');
    const res = await practitionersApi.update(token, practitionerId, {
      name: form.name || undefined,
      bio: form.bio || undefined,
      specialties,
      languages,
      certifications,
      experienceYrs: parseInt(form.experienceYrs) || 0,
      perMinuteRate: parseFloat(form.perMinuteRate) || 0,
    });
    setSaving(false);
    if (res.success && res.data) {
      setProfile(res.data.practitioner as ExpertProfile);
      localStorage.setItem('hc_practitioner_name', res.data.practitioner.name);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } else setError(res.message || 'Failed to save');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !practitionerId) return;
    const token = tokenStore.getAccess();
    if (!token) return;
    setUploading(true);
    const res = await practitionersApi.uploadPhoto(token, practitionerId, file);
    setUploading(false);
    if (res.success && res.data) setProfile((p) => p ? { ...p, photoUrl: res.data!.photoUrl } : p);
  };

  const addCert = () => {
    const val = form.certInput.trim();
    if (val && !certifications.includes(val)) setCertifications((prev) => [...prev, val]);
    setForm((f) => ({ ...f, certInput: '' }));
  };

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const handleExport = async () => {
    const token = tokenStore.getAccess();
    if (!token) return;
    setExporting(true);
    setError('');
    try {
      const res = await practitionersApi.exportData(token);
      if (res.success && res.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `healconnect-my-data-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Previously silent: a non-success response (bad token, 5xx, etc.) left
        // the button just stop spinning with no file and no explanation —
        // indistinguishable from the feature doing nothing at all.
        setError(res.message || 'Failed to export your data. Please try again.');
      }
    } catch (err) {
      // Previously unhandled: any thrown error (network failure, non-JSON
      // response from a proxy/504, etc.) propagated silently past this
      // try/finally with no catch, so the export could fail with zero
      // visible feedback to the user.
      console.error('Export failed:', err);
      setError('Failed to export your data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const token = tokenStore.getAccess();
    if (!token) return;
    setDeleting(true);
    setDeleteError('');
    const res = await practitionersApi.deleteAccount(token);
    setDeleting(false);
    if (res.success) {
      tokenStore.clear();
      localStorage.removeItem('hc_role');
      localStorage.removeItem('hc_practitioner_id');
      localStorage.removeItem('hc_pid');
      localStorage.removeItem('hc_practitioner_name');
      router.replace('/');
    } else {
      setDeleteError(res.message || 'Failed to delete account');
    }
  };

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

  const initials = profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-amber-100 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/expert/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-amber-500 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="font-extrabold text-amber-500">HealConnect</span>
          </Link>
          <div className="text-sm font-semibold text-gray-600">Expert Profile</div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-6">

        {/* Profile Header Card */}
        <Card className="bg-white border-0 shadow-lg rounded-2xl overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 relative">
            <div className="absolute -bottom-12 left-6">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-xl border-4 border-white bg-white">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
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
            <h1 className="text-xl font-extrabold text-gray-900">{profile.name}</h1>
            <p className="text-sm text-amber-600 font-medium">{profile.specialties.slice(0, 2).join(' · ') || 'Expert'}</p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {profile.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm text-gray-500">{profile.email}</span>
                </div>
              )}
              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  <Check className="w-3 h-3" /> Verified
                </span>
              )}
              {profile.avgRating !== undefined && (
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                  <span className="text-sm font-semibold">{profile.avgRating || '—'}</span>
                  <span className="text-xs text-gray-400">({profile.reviewCount ?? 0} reviews)</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Basic Info */}
        <Card className="bg-white border border-amber-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-amber-50 flex items-center gap-2">
            <User className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Basic Information</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className={LABEL_CLS}><User className="w-3 h-3 inline mr-1 text-amber-500" /> Full Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your full name" className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}><BookOpen className="w-3 h-3 inline mr-1 text-amber-500" /> Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Tell users about yourself..."
                rows={3}
                className={INPUT_CLS + ' resize-none'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}><IndianRupee className="w-3 h-3 inline mr-1 text-amber-500" /> Rate (₹/min)</label>
                <input type="number" min="0" value={form.perMinuteRate} onChange={(e) => setForm((f) => ({ ...f, perMinuteRate: e.target.value }))} className={INPUT_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}><Star className="w-3 h-3 inline mr-1 text-amber-500" /> Experience (yrs)</label>
                <input type="number" min="0" value={form.experienceYrs} onChange={(e) => setForm((f) => ({ ...f, experienceYrs: e.target.value }))} className={INPUT_CLS} />
              </div>
            </div>
          </div>
        </Card>

        {/* Specialties */}
        <Card className="bg-white border border-amber-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-amber-50 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Specialties</h2>
          </div>
          <div className="p-6 flex flex-wrap gap-2.5">
            {SPECIALTIES.map((s) => (
              <button key={s} onClick={() => toggle(specialties, setSpecialties, s)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  specialties.includes(s)
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-gray-600 border-amber-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </Card>

        {/* Languages */}
        <Card className="bg-white border border-amber-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-amber-50 flex items-center gap-2">
            <Languages className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Languages</h2>
          </div>
          <div className="p-6 flex flex-wrap gap-2.5">
            {LANGUAGES.map((l) => (
              <button key={l} onClick={() => toggle(languages, setLanguages, l)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  languages.includes(l)
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white text-gray-600 border-amber-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </Card>

        {/* Certifications */}
        <Card className="bg-white border border-amber-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-amber-50 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Certifications</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <input
                value={form.certInput}
                onChange={(e) => setForm((f) => ({ ...f, certInput: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && addCert()}
                placeholder="e.g. Reiki Level 2"
                className={INPUT_CLS}
              />
              <Button onClick={addCert} className="bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-lg px-4 shrink-0">Add</Button>
            </div>
            {certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {certifications.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-3 py-1 rounded-full">
                    {c}
                    <button onClick={() => setCertifications((prev) => prev.filter((x) => x !== c))} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Privacy & Data */}
        <Card className="bg-white border border-amber-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-3 border-b border-amber-50">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900">Privacy & Data</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 ml-7">
              Download a copy of your data or permanently delete your account. See our{' '}
              <Link href="/privacy" className="underline hover:text-amber-600">Privacy Policy</Link>.
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-gray-900">Download my data</p>
                <p className="text-xs text-gray-400">A JSON file with your profile, sessions, reviews, and consent history.</p>
              </div>
              <Button onClick={handleExport} disabled={exporting} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50 rounded-full shrink-0">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1.5" /> Export</>}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-amber-50">
              <div>
                <p className="text-sm font-bold text-red-600">Delete my account</p>
                <p className="text-xs text-gray-400">Removes your personal details permanently. This can't be undone.</p>
              </div>
              <Button onClick={() => setDeleteOpen(true)} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-full shrink-0">
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </div>

            {deleteOpen && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-xs text-red-700">
                  This permanently removes your name, email, phone, bio, and other personal details, and erases your
                  chat and call history content. Type <span className="font-bold">DELETE</span> to confirm.
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full text-sm rounded-lg border border-red-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
                />
                {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting} className="bg-red-600 hover:bg-red-700 text-white rounded-full disabled:opacity-50">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Permanently delete'}
                  </Button>
                  <Button onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); setDeleteError(''); }} variant="outline" className="rounded-full">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-5 py-3.5">
            <X className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-3 pb-8">
          <Button onClick={handleSave} disabled={saving}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-full h-12 font-bold shadow-lg shadow-amber-200 transition-all">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? <><Check className="h-5 w-5 mr-2" /> Saved!</> : 'Save Changes'}
          </Button>
          <Link href="/expert/dashboard">
            <Button variant="outline" className="border-amber-200 text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-full h-12 px-6">Cancel</Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
