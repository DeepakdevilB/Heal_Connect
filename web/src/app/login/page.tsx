'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, ShieldCheck, Star, Eye, EyeOff, Loader2, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, tokenStore } from '@/lib/api';

type Role = 'user' | 'expert';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>('user');

  useEffect(() => {
    if (searchParams.get('role') === 'expert') setRole('expert');
  }, [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setVerifyUrl(null);
    setLoading(true);
    try {
      if (role === 'expert') {
        const res = await authApi.practitionerLogin(email, password);
        if (!res.success || !res.data) { setError(res.message || 'Login failed'); return; }
        tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        localStorage.setItem('hc_role', 'practitioner');
        localStorage.setItem('hc_practitioner_id', res.data.practitioner.id);
        localStorage.setItem('hc_pid', res.data.practitioner.id);
        localStorage.setItem('hc_practitioner_name', res.data.practitioner.name ?? '');
        router.push('/expert/dashboard');
      } else {
        const res = await authApi.login({ email, password });
        if (!res.success || !res.data) {
          setError(res.message || 'Login failed');
          if (res.code === 'UNVERIFIED_ACCOUNT' && (res as any).data?.verifyUrl) {
            setVerifyUrl((res as any).data.verifyUrl);
          }
          return;
        }
        tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        localStorage.removeItem('hc_role');
        localStorage.removeItem('hc_practitioner_id');
        localStorage.removeItem('hc_pid');
        localStorage.removeItem('hc_practitioner_name');
        router.push('/dashboard');
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-[#fffbf0] flex flex-col md:flex-row font-sans">
      {/* Left — Branding */}
      <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-[#f59e0b] via-[#d97706] to-[#b45309] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-900/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Image src="/logo.png" alt="HealConnect" width={36} height={36} className="rounded-full" />
            <span className="text-2xl font-extrabold text-white">HealConnect</span>
          </Link>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Begin your journey <br /> to inner peace.
          </h1>
          <p className="text-lg text-yellow-100 max-w-md leading-relaxed mb-12">
            Join 50,000+ members receiving guidance from world-class verified practitioners.
          </p>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[#ffffff] font-semibold">100% Private & Secure</p>
                <p className="text-sm text-yellow-100">Your data and conversations are encrypted.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Verified Experts</p>
                <p className="text-sm text-yellow-100">Rigorous 5-step background checks.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto pt-12 border-t border-white/20">
          <p className="text-yellow-100 text-sm">© 2026 Tara Infotech. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <Card className="w-full max-w-md bg-white border border-yellow-100 shadow-xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-extrabold text-[#1a1a1a]">
              Log in to your account
            </CardTitle>
            <CardDescription className="text-gray-500 text-base">
              Welcome back! Enter your credentials to continue.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Role Toggle */}
            <div className="flex rounded-xl border border-yellow-200 overflow-hidden bg-[#fffbf0] p-1 gap-1">
              <button type="button" onClick={() => { setRole('user'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  role === 'user' ? 'bg-[#f59e0b] text-white shadow' : 'text-gray-500 hover:text-[#f59e0b]'}`}>
                <User className="w-4 h-4" /> User
              </button>
              <button type="button" onClick={() => { setRole('expert'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  role === 'expert' ? 'bg-[#f59e0b] text-white shadow' : 'text-gray-500 hover:text-[#f59e0b]'}`}>
                <Sparkles className="w-4 h-4" /> Expert
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 space-y-2">
                <p className="font-semibold">{error}</p>
                {verifyUrl && (
                  <a href={verifyUrl} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-xs shadow-md transition-all">
                    ✦ Click Here to Verify Email Now →
                  </a>
                )}
              </div>
            )}
            {success && <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">{success}</div>}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1a1a1a]">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="pl-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1a1a1a]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-10 pr-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold rounded-xl shadow-md text-base">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In →'}
              </Button>
            </form>

            <div className="text-center pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium">
                Don't have an account?{' '}
                <Link href="/signup" className="font-extrabold text-[#f59e0b] hover:underline">
                  Sign up for free
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fffbf0] flex items-center justify-center text-amber-600 font-bold">Loading...</div>}>
      <LoginInner />
    </Suspense>
  );
}
