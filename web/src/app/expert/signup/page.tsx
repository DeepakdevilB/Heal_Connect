'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { astrologerTokenStore } from '@/lib/api';

export default function ExpertSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [kycDocument, setKycDocument] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<File[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    // if (!kycDocument) { setError('KYC Document is required.'); return; }

    setLoading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('password', form.password);
    formData.append('kycDocument', kycDocument);
    certificates.forEach(c => formData.append('certificates', c));

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/auth/astrologer/register', true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded * 100) / e.total));
        }
      };

      xhr.onload = () => {
        setLoading(false);
        try {
          const res = JSON.parse(xhr.responseText);
          if (!res.success) {
            setError(res.message || 'Registration failed.');
            return;
          }
          astrologerTokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
          if (res.data.astrologer) astrologerTokenStore.setProfile(res.data.astrologer);
          router.push('/astrologer/onboarding');
        } catch {
          setError('Failed to parse response.');
        }
      };

      xhr.onerror = () => {
        setLoading(false);
        setError('Upload failed. Please check your network connection.');
      };

      xhr.send(formData);
    } catch {
      setLoading(false);
      setError('Something went wrong. Please try again.');
    }
  };

  const inputCls = "w-full h-12 rounded-xl border border-yellow-200 bg-[#fffbf0] px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";

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
            Join as an<br />Expert Practitioner
          </h1>
          <p className="text-amber-100/80 text-sm leading-relaxed mt-4 max-w-xs">
            Create your account and complete a short onboarding form. Our team will review your application and get back to you.
          </p>
          <div className="mt-8 space-y-3">
            {['Vedic Astrology', 'Numerology', 'Tarot', 'Vastu', 'Energy Healing', 'Life Coaching'].map(tag => (
              <span key={tag} className="inline-block mr-2 mb-2 px-3 py-1 bg-white/15 text-white text-xs rounded-full">{tag}</span>
            ))}
          </div>
        </div>
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-amber-100/60 text-xs">© 2026 HealConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 p-8">
            <h2 className="text-xl font-extrabold text-gray-900 mb-1">Create your expert account</h2>
            <p className="text-sm text-gray-500 mb-6">Step 1 of 2 — Account setup</p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input className={inputCls} placeholder="Your full name" value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    className={inputCls + ' pr-11'}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password <span className="text-red-500">*</span></label>
                <input
                  className={inputCls}
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={e => set('confirm', e.target.value)}
                  required
                />
              </div>
              
              {/* HIDDEN FOR NOW
              <div className="pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">KYC Document (ID Proof) <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => setKycDocument(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Certificates <span className="text-gray-400 font-normal">(Optional, max 5)</span></label>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={e => setCertificates(Array.from(e.target.files || []).slice(0, 5))}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                />
                {certificates.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">{certificates.length} file(s) selected.</p>
                )}
              </div>
              */}

              {loading && progress > 0 && (
                <div className="w-full bg-amber-100 rounded-full h-2 mt-2">
                  <div className="bg-amber-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  <p className="text-xs text-center text-amber-600 mt-1">{progress}% Uploaded</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="mt-3 w-full h-12 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-full text-sm shadow-lg flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Creating account...' : 'Create Account & Continue →'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/expert/login-email" className="text-amber-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
