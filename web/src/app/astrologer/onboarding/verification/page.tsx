'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore } from '@/lib/api';
import { Loader2, ChevronLeft, CheckCircle } from 'lucide-react';
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

const VERIFICATION_OPTIONS = ['Yes', 'No', "I'd like to discuss this"];
const textareaCls = "w-full rounded-xl border border-yellow-200 bg-[#fffbf0] px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition resize-none";

export default function AstrologerVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [anythingElse, setAnythingElse] = useState('');
  const [verificationComfort, setVerificationComfort] = useState('');

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }
    astrologerApi.getApplication(token).then((res) => {
      if (!res.success) { astrologerTokenStore.clear(); router.replace('/astrologer/login'); return; }
      const p = res.data?.profile;
      if (p) {
        if (p.applicationStatus === 'APPROVED' && p.accountStatus === 'ACTIVE') { router.replace('/astrologer/dashboard'); return; }
        if (['ADMIN_REVIEW', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED'].includes(p.applicationStatus)) { router.replace('/astrologer/onboarding/submitted'); return; }
      }
      setLoading(false);
    }).catch(() => router.replace('/astrologer/login'));
  }, [router]);

  const handleSubmit = async () => {
    if (!verificationComfort) { setError('Please answer the verification question.'); return; }
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }
    setSubmitting(true); setError('');
    try {
      await astrologerApi.updateApplication(token, { previousPlatformExperience: anythingElse || undefined, step: 3 });
      await astrologerApi.submitVerification(token, {
        verificationNotes: `Verification comfort: ${verificationComfort}${anythingElse ? ` | Notes: ${anythingElse}` : ''}`,
        verificationType: 'EXPERIENCE',
      });
      router.push('/astrologer/onboarding/submitted');
    } catch { setError('Submission failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fffbf0]">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fffbf0] flex flex-col md:flex-row font-sans">

      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-start w-5/12 p-12 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 relative overflow-hidden sticky top-0 h-screen">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Image src="/logo.png" alt="HealConnect" width={36} height={36} className="rounded-full" />
            <span className="text-2xl font-extrabold text-white">HealConnect</span>
          </Link>
          <div className="mb-4 inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full tracking-wide">
            STEP 3 OF 3
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
            Almost<br />There
          </h1>
          <p className="text-amber-200 text-lg font-semibold mb-5">One last step.</p>
          <p className="text-white/80 text-sm leading-relaxed max-w-sm">
            We won't ask you to upload documents at this stage. Any further verification will depend on the nature of your practice.
          </p>
          <p className="text-white/70 text-sm leading-relaxed mt-4 max-w-sm">
            If we feel your practice could be a good fit, we'll be in touch for a short conversation.
          </p>
        </div>
        <div className="relative z-10 mt-auto pt-12 border-t border-white/20">
          <p className="text-amber-100/60 text-xs">© 2026 HealConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
        </div>

        <div className="w-full max-w-2xl">
          <StepBar step={3} />

          <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 p-8 space-y-7">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 mb-1">Final Details</h2>
              <p className="text-sm text-gray-500">Almost done — just a couple more things.</p>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

            {/* Anything else */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Anything else you'd like us to know? <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea className={textareaCls} rows={4} placeholder="Optional." value={anythingElse} onChange={e => setAnythingElse(e.target.value)} />
            </div>

            {/* Verification */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                If we invite you to the next stage <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Would you be comfortable taking part in a short conversation and, if you progress further, providing appropriate identification and/or supporting information about your practice?
              </p>
              <div className="space-y-2.5">
                {VERIFICATION_OPTIONS.map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    verificationComfort === opt
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-200 bg-white'
                  }`}>
                    <input type="radio" name="verification" value={opt} checked={verificationComfort === opt}
                      onChange={() => setVerificationComfort(opt)} className="accent-amber-500 w-4 h-4" />
                    <span className="text-sm font-medium text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                We won't ask you to upload documents at this stage.
              </p>
            </div>

            {/* Nav */}
            <div className="flex justify-between items-center pt-2">
              <button onClick={() => router.push('/astrologer/onboarding/profile')} disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-7 h-11 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold shadow-lg transition-colors">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
