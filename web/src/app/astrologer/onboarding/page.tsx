'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore } from '@/lib/api';
import { Loader2, ChevronRight, User, Mail, MapPin, Globe, Briefcase } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

function StepBar({ step }: { step: number }) {
  const steps = ['About You', 'Your Practice', 'Final Details'];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => {
        const s = i + 1;
        const done = step > s;
        const active = step === s;
        return (
          <div key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                done    ? 'bg-amber-500 border-amber-500 text-white' :
                active  ? 'bg-white border-amber-500 text-amber-600' :
                          'bg-white border-gray-200 text-gray-400'
              }`}>
                {done ? '✓' : s}
              </div>
              <span className={`text-[11px] font-medium hidden sm:block ${active ? 'text-amber-600' : done ? 'text-amber-400' : 'text-gray-400'}`}>{label}</span>
            </div>
            {s < 3 && (
              <div className={`w-16 sm:w-24 h-0.5 mx-1 mb-5 rounded ${done ? 'bg-amber-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const inputCls = "w-full h-12 rounded-xl border border-yellow-200 bg-[#fffbf0] pl-11 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";

function Field({ label, required, icon, children }: { label: string; required?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-3.5 text-gray-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

export default function AstrologerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ fullName: '', businessName: '', email: '', location: '', website: '' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }
    astrologerApi.getApplication(token).then((res) => {
      if (!res.success) { astrologerTokenStore.clear(); router.replace('/astrologer/login'); return; }
      const p = res.data?.profile;
      if (p) {
        if (p.applicationStatus === 'APPROVED' && p.accountStatus === 'ACTIVE') { router.replace('/astrologer/dashboard'); return; }
        if (['ADMIN_REVIEW', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED'].includes(p.applicationStatus)) { router.replace('/astrologer/onboarding/submitted'); return; }
        if (p.fullLegalName) set('fullName', p.fullLegalName);
        if (p.displayName) set('businessName', p.displayName);
        if (p.email) set('email', p.email);
        if (p.city || p.country) set('location', [p.city, p.country].filter(Boolean).join(', '));
      }
      setLoading(false);
    }).catch(() => router.replace('/astrologer/login'));
  }, [router]);

  const handleNext = async () => {
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { setError('Valid email is required.'); return; }
    if (!form.location.trim()) { setError('Please tell us where you are based.'); return; }
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }
    setSaving(true); setError('');
    try {
      await astrologerApi.updateApplication(token, {
        fullLegalName: form.fullName,
        displayName: form.businessName || form.fullName,
        email: form.email,
        city: form.location,
        step: 1,
      });
      router.push('/astrologer/onboarding/profile');
    } catch { setError('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffbf0]">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fffbf0] flex flex-col md:flex-row font-sans">

      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-5/12 p-12 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Image src="/logo.png" alt="HealConnect" width={36} height={36} className="rounded-full" />
            <span className="text-2xl font-extrabold text-white">HealConnect</span>
          </Link>
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Practitioner<br />Interest Form
          </h1>
          <p className="text-amber-100 text-lg font-medium mb-2">Discover. Connect. Thrive.</p>
          <p className="text-amber-100/80 text-sm leading-relaxed mt-4 max-w-xs">
            We're building a curated community of trusted practitioners across holistic health, astrology, spirituality, and personal development.
          </p>
          <p className="text-amber-100/80 text-sm leading-relaxed mt-4 max-w-xs">
            This short form takes around 5 minutes. If we feel your practice could be a good fit, we'll be in touch for a conversation.
          </p>
        </div>
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-amber-100/60 text-xs">© 2026 HealConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
        </div>

        <div className="w-full max-w-md">
          <StepBar step={1} />

          <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 p-8">
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Tell us about you</h2>
            <p className="text-sm text-gray-500 mb-6">Basic contact information so we can get in touch.</p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
            )}

            <div className="space-y-4">
              <Field label="Full Name" required icon={<User className="w-4 h-4" />}>
                <input className={inputCls} placeholder="Your full name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
              </Field>
              <Field label="Professional / Business Name" icon={<Briefcase className="w-4 h-4" />}>
                <input className={inputCls} placeholder="Optional" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
              </Field>
              <Field label="Email" required icon={<Mail className="w-4 h-4" />}>
                <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Where are you based?" required icon={<MapPin className="w-4 h-4" />}>
                <input className={inputCls} placeholder="Country / City" value={form.location} onChange={e => set('location', e.target.value)} />
              </Field>
              <Field label="Website or social media" icon={<Globe className="w-4 h-4" />}>
                <input className={inputCls} placeholder="Optional — link to your work" value={form.website} onChange={e => set('website', e.target.value)} />
              </Field>
            </div>

            <button onClick={handleNext} disabled={saving}
              className="mt-7 w-full h-12 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-full text-sm shadow-lg flex items-center justify-center gap-2 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already registered?{' '}
            <Link href="/astrologer/login" className="text-amber-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
