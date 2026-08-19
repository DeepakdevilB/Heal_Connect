'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore } from '@/lib/api';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
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
            {s < 3 && <div className={`w-16 sm:w-24 h-0.5 mx-1 mb-5 rounded ${done ? 'bg-amber-400' : 'bg-gray-200'}`} />}
          </div>
        );
      })}
    </div>
  );
}

const PRACTICE_AREAS = [
  { group: 'Astrology & Divination', items: ['Astrology', 'Numerology', 'Tarot', 'Oracle Cards', 'Psychic / Intuitive Reading', 'Mediumship', 'Akashic Records', 'Human Design', 'Gene Keys'] },
  { group: 'Spiritual & Esoteric', items: ['Spiritual Guidance', 'Spiritual Mentoring', 'Spiritual Coaching', 'Energy Healing', 'Chakra / Aura Work', 'Ancestral Work', 'Past Life Work', 'Shadow / Inner Child Work', 'Shamanic Practices'] },
  { group: 'Meditation & Consciousness', items: ['Meditation', 'Mindfulness', 'Breathwork', 'Manifestation', 'Spiritual / Consciousness Development'] },
  { group: 'Holistic Health & Wellbeing', items: ['Holistic Wellness', 'Nutrition', 'Herbalism', 'Ayurveda', 'Traditional Chinese Medicine', 'Yoga / Movement', 'Wellness Coaching'] },
  { group: 'Space & Environment', items: ['Feng Shui', 'Vastu Shastra', 'Space Clearing', 'Sacred Space', 'Home / Environmental Energy'] },
  { group: 'Coaching & Personal Development', items: ['Life Coaching', 'Relationship Guidance', 'Career / Life Purpose', 'Personal Development', 'Mindset / Transformation Coaching'] },
];

const ALL_ITEMS = PRACTICE_AREAS.flatMap(g => g.items);
const EXPERIENCE_OPTIONS = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'];
const OFFERING_OPTIONS = ['1-to-1 sessions', 'Readings / Consultations', 'Coaching', 'Healing / Energy sessions', 'Guidance / Mentoring', 'Group sessions', 'Workshops', 'Courses', 'Other'];

function SectionLabel({ num, title, subtitle }: { num: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
      <div>
        <p className="text-sm font-bold text-gray-800">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-600 bg-white'
      }`}>
      {label}
    </button>
  );
}

const selectCls = "w-full h-12 rounded-xl border border-yellow-200 bg-[#fffbf0] px-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition appearance-none";
const textareaCls = "w-full rounded-xl border border-yellow-200 bg-[#fffbf0] px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition resize-none";

export default function AstrologerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    selectedAreas: [] as string[],
    otherPractice: '',
    mainArea: '',
    experience: '',
    expertiseDevelopment: '',
    offerings: [] as string[],
    practiceBio: '',
    whyHealConnect: '',
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const toggleArea = (v: string) => setForm(f => ({ ...f, selectedAreas: f.selectedAreas.includes(v) ? f.selectedAreas.filter(x => x !== v) : [...f.selectedAreas, v] }));
  const toggleOffering = (v: string) => setForm(f => ({ ...f, offerings: f.offerings.includes(v) ? f.offerings.filter(x => x !== v) : [...f.offerings, v] }));

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }
    astrologerApi.getApplication(token).then((res) => {
      if (!res.success) { astrologerTokenStore.clear(); router.replace('/astrologer/login'); return; }
      const p = res.data?.profile;
      if (p) {
        if (p.applicationStatus === 'APPROVED' && p.accountStatus === 'ACTIVE') { router.replace('/astrologer/dashboard'); return; }
        if (['ADMIN_REVIEW', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED'].includes(p.applicationStatus)) { router.replace('/astrologer/onboarding/submitted'); return; }
        if (p.specializations?.length) set('selectedAreas', p.specializations);
        if (p.professionalBio) set('practiceBio', p.professionalBio);
      }
      setLoading(false);
    }).catch(() => router.replace('/astrologer/login'));
  }, [router]);

  const handleNext = async () => {
    if (form.selectedAreas.length === 0 && !form.otherPractice.trim()) { setError('Please select at least one practice area.'); return; }
    if (!form.mainArea) { setError('Please select your main area of practice.'); return; }
    if (!form.experience) { setError('Please select how long you have been practising.'); return; }
    if (!form.expertiseDevelopment.trim()) { setError('Please tell us how you developed your expertise.'); return; }
    if (form.offerings.length === 0) { setError('Please select at least one offering.'); return; }
    if (!form.practiceBio.trim()) { setError('Please tell us about your practice.'); return; }
    if (!form.whyHealConnect.trim()) { setError('Please tell us what interests you about HealConnect.'); return; }

    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }
    const expYears: Record<string, number> = { 'Less than 1 year': 0, '1–3 years': 1, '3–5 years': 3, '5–10 years': 5, '10+ years': 10 };
    setSaving(true); setError('');
    try {
      await astrologerApi.updateApplication(token, {
        specializations: [...form.selectedAreas, ...(form.otherPractice.trim() ? [form.otherPractice.trim()] : [])],
        astrologyExperienceYears: expYears[form.experience] ?? 0,
        professionalBio: form.practiceBio,
        consultationApproach: form.expertiseDevelopment,
        previousPlatformExperience: form.whyHealConnect,
        step: 2,
      });
      router.push('/astrologer/onboarding/verification');
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
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">Your Practice</h1>
          <p className="text-amber-100/80 text-sm leading-relaxed mt-4 max-w-xs">
            We welcome practitioners from all backgrounds — formal training, certification, mentorship, lineage, or years of dedicated practice.
          </p>
          <div className="mt-8 space-y-3">
            {['Astrology & Divination', 'Energy Healing', 'Meditation & Mindfulness', 'Holistic Wellness', 'Vastu & Space', 'Life Coaching'].map(tag => (
              <span key={tag} className="inline-block mr-2 mb-2 px-3 py-1 bg-white/15 text-white text-xs rounded-full">{tag}</span>
            ))}
          </div>
        </div>
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-amber-100/60 text-xs">© 2026 HealConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 py-12 overflow-y-auto">

        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
        </div>

        <div className="w-full max-w-lg">
          <StepBar step={2} />

          <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 p-8 space-y-8">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-1">What do you offer?</h2>
              <p className="text-sm text-gray-500">Tell us about your practice and experience.</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

            {/* Practice Areas */}
            <div>
              <SectionLabel num="2" title="Which area(s) best describe your practice?" subtitle="Select all that apply." />
              <div className="space-y-4">
                {PRACTICE_AREAS.map(group => (
                  <div key={group.group}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group.group}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map(item => (
                        <Pill key={item} label={item} active={form.selectedAreas.includes(item)} onClick={() => toggleArea(item)} />
                      ))}
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Other</p>
                  <textarea className={textareaCls} rows={2} placeholder="Please tell us about your practice..." value={form.otherPractice} onChange={e => set('otherPractice', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Main Area */}
            <div>
              <SectionLabel num="3" title="What is your main area of practice?" />
              <div className="relative">
                <select className={selectCls} value={form.mainArea} onChange={e => set('mainArea', e.target.value)}>
                  <option value="">Select one</option>
                  {[...ALL_ITEMS, 'Other'].map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronRight className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
              </div>
            </div>

            {/* Experience */}
            <div>
              <SectionLabel num="4" title="How long have you been practising?" />
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_OPTIONS.map(opt => (
                  <Pill key={opt} label={opt} active={form.experience === opt} onClick={() => set('experience', opt)} />
                ))}
              </div>
            </div>

            {/* Expertise */}
            <div>
              <SectionLabel num="4" title="How did you develop your expertise?" subtitle="e.g. formal training, certification, mentorship, lineage, self-study, or a combination." />
              <textarea className={textareaCls} rows={3} placeholder="Short paragraph." value={form.expertiseDevelopment} onChange={e => set('expertiseDevelopment', e.target.value)} />
            </div>

            {/* Offerings */}
            <div>
              <SectionLabel num="5" title="How do you work with clients online?" subtitle="What would you like to offer through HealConnect?" />
              <div className="flex flex-wrap gap-2">
                {OFFERING_OPTIONS.map(opt => (
                  <Pill key={opt} label={opt} active={form.offerings.includes(opt)} onClick={() => toggleOffering(opt)} />
                ))}
              </div>
            </div>

            {/* Practice Bio */}
            <div>
              <SectionLabel num="6" title="Tell us about your practice" subtitle="What can someone expect when they work with you?" />
              <textarea className={textareaCls} rows={4} placeholder="Short paragraph." value={form.practiceBio} onChange={e => set('practiceBio', e.target.value)} />
            </div>

            {/* Why HealConnect */}
            <div>
              <SectionLabel num="7" title="What interests you about HealConnect?" />
              <textarea className={textareaCls} rows={3} placeholder="Short paragraph." value={form.whyHealConnect} onChange={e => set('whyHealConnect', e.target.value)} />
            </div>

            {/* Nav */}
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => router.push('/astrologer/onboarding')}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={handleNext} disabled={saving}
                className="flex items-center gap-2 px-7 h-11 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold shadow-lg transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
