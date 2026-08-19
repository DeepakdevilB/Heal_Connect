'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { astrologerTokenStore } from '@/lib/api';
import { Loader2, ShieldCheck, Star, Users, TrendingUp, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function AstrologerLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/astrologer/login-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      }).then(r => r.json());

      if (!res.success) { setError(res.message || 'Invalid email or password.'); return; }

      astrologerTokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      if (res.data.astrologer) astrologerTokenStore.setProfile(res.data.astrologer);
      router.push(res.data.redirect || '/astrologer/onboarding');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const inputCls = "w-full h-12 rounded-xl border border-yellow-200 bg-[#fffbf0] px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-[#fffbf0] flex flex-col md:flex-row font-sans">

      {/* Left — Branding */}
      <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Image src="/logo.png" alt="HealConnect" width={36} height={36} className="rounded-full" />
            <span className="text-2xl font-extrabold text-white">HealConnect</span>
          </Link>
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <Star className="w-4 h-4 fill-white" /> Astrologer Portal
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Share your wisdom.<br />Grow your practice.
          </h1>
          <p className="text-lg text-yellow-100 max-w-md leading-relaxed mb-12">
            Join thousands of verified astrologers earning on HealConnect — consult clients via chat & call, on your schedule.
          </p>
          <div className="space-y-6">
            {[
              { icon: Users, title: '50,000+ Active Users', desc: 'Clients waiting for guidance right now.' },
              { icon: TrendingUp, title: 'Earn ₹500–₹5000/day', desc: 'Set your own rates, work anytime.' },
              { icon: Sparkles, title: 'Verified & Trusted', desc: 'Our badge builds client confidence.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold">{title}</p>
                  <p className="text-sm text-yellow-100">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 mt-auto pt-12 border-t border-white/20">
          <p className="text-yellow-100 text-sm">© 2026 Tara Infotech. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute top-6 left-6 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
          </Link>
        </div>

        <div className="w-full max-w-md mt-12 md:mt-0">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 md:hidden">
              <Star className="w-4 h-4" /> Astrologer Portal
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Sign in to your account</h1>
            <p className="text-gray-500 text-sm mt-1">Welcome back, practitioner</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 p-8">
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    className={inputCls + ' pr-11'}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your password"
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-full text-base shadow-lg flex items-center justify-center gap-2 transition-colors mt-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Sign In <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            New here?{' '}
            <Link href="/expert/signup" className="text-amber-600 font-semibold hover:underline">Create an account</Link>
          </p>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure login · Your data is encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
