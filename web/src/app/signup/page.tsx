'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Star, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, tokenStore } from '@/lib/api';

type Role = 'user' | 'expert';

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>('user');

  useEffect(() => {
    if (searchParams.get('role') === 'expert') setRole('expert');
  }, [searchParams]);

  // Redirect already-logged-in users
  useEffect(() => {
    const token = localStorage.getItem('hc_access');
    if (!token) return;
    const isExpert = localStorage.getItem('hc_role') === 'practitioner';
    router.replace(isExpert ? '/expert/dashboard' : '/dashboard');
  }, [router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [emailMarketingOptIn, setEmailMarketingOptIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!acceptTerms || !acceptPrivacy) {
      setError('Please accept the Terms of Service and Privacy Notice to continue.');
      return;
    }
    // CHILD-02: client-side age check for instant feedback (server also enforces)
    if (!dob) {
      setError('Please enter your date of birth.');
      return;
    }
    const dobDate = new Date(dob);
    const minBirthDate = new Date();
    minBirthDate.setFullYear(minBirthDate.getFullYear() - 18);
    if (isNaN(dobDate.getTime()) || dobDate > minBirthDate) {
      setError('You must be at least 18 years old to create an account.');
      return;
    }
    setLoading(true);
    const pwdOk = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
    if (!pwdOk) { setError('Password must be min. 8 chars, 1 uppercase, 1 number.'); setLoading(false); return; }
    try {
      if (role === 'expert') {
        const res = await authApi.practitionerRegister(name, email, password, dob, {
          acceptTerms,
          acceptPrivacy,
          emailMarketingOptIn,
        });
        if (!res.success || !res.data) {
          setError(res.message || 'Registration failed');
          return;
        }
        tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        localStorage.setItem('hc_role', 'practitioner');
        localStorage.setItem('hc_practitioner_id', res.data.practitioner.id);
        localStorage.setItem('hc_pid', res.data.practitioner.id);
        localStorage.setItem('hc_practitioner_name', res.data.practitioner.name ?? name);
        setSuccess('Expert account created!');
        setTimeout(() => router.push('/expert/dashboard'), 1200);
      } else {
        const res = await authApi.register({ name, email, password, dob, acceptTerms, acceptPrivacy, emailMarketingOptIn });
        if (!res.success || !res.data) {
          setError(res.errors?.length ? res.errors.map((e) => e.message).join(' · ') : res.message || 'Registration failed');
          return;
        }
        tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        localStorage.removeItem('hc_role');
        localStorage.removeItem('hc_practitioner_id');
        localStorage.removeItem('hc_pid');
        localStorage.removeItem('hc_practitioner_name');
        setSuccess('Account created!');
        setTimeout(() => router.push(`/verify-email/pending?email=${encodeURIComponent(email)}`), 1200);
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return setError('Please enter a phone number.');
    setLoading(true);
    setError('');
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      const res = await (authApi as any).requestLoginOtp(cleanPhone, 'user');
      if (!res.success) {
        setError(res.message || 'Failed to send OTP.');
        return;
      }
      router.push(`/verify-otp?phone=${encodeURIComponent(cleanPhone)}&type=register&role=user`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong sending OTP.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) { setError('Google Sign-In is not configured yet.'); return; }
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
    const scope = encodeURIComponent('openid email profile');
    const state = role === 'expert' ? 'expert' : 'user';
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=id_token&scope=${scope}&state=${state}&nonce=${Math.random().toString(36)}`;
  }

  function handleAppleSignIn() {
    setError('Apple Sign-In requires native SDK configuration.');
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
                <p className="text-white font-semibold">100% Private & Secure</p>
                <p className="text-sm text-yellow-100">Your data and conversations are encrypted.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">First Session Free</p>
                <p className="text-sm text-yellow-100">No credit card required.</p>
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
        <div className="absolute top-6 left-6 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="text-xl font-extrabold text-[#f59e0b]">HealConnect</span>
          </Link>
        </div>

        <Card className="w-full max-w-md bg-white border border-yellow-100 shadow-xl mt-8 md:mt-0">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-extrabold text-[#1a1a1a]">Create an account</CardTitle>
            <CardDescription className="text-gray-500 text-base">Sign up and get your first session free.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                <p className="font-semibold">✓ {success}</p>
                <p className="text-green-600 mt-0.5">
                  A verification email has been sent. Please verify before logging in.
                </p>
              </div>
            )}

            <div className="flex rounded-xl border border-yellow-200 overflow-hidden bg-[#fffbf0] p-1 gap-1 mb-4">
              <button type="button" onClick={() => { setLoginMethod('password'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  loginMethod === 'password' ? 'bg-[#f59e0b] text-white shadow' : 'text-gray-500 hover:text-[#f59e0b]'}`}>
                Email & Password
              </button>
              <button type="button" onClick={() => { setLoginMethod('otp'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  loginMethod === 'otp' ? 'bg-[#f59e0b] text-white shadow' : 'text-gray-500 hover:text-[#f59e0b]'}`}>
                Phone & OTP
              </button>
            </div>

            {loginMethod === 'otp' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#1a1a1a]">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="+919876543210" value={phone} onChange={(e) => setPhone(e.target.value)} required className="h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                </div>
                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required className="mt-0.5 rounded border-yellow-300 text-[#f59e0b] focus:ring-[#f59e0b]" />
                    <span>I agree to the <Link href="/terms" target="_blank" className="text-[#f59e0b] font-semibold hover:underline">Terms of Service</Link></span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-gray-600">
                    <input type="checkbox" checked={acceptPrivacy} onChange={(e) => setAcceptPrivacy(e.target.checked)} required className="mt-0.5 rounded border-yellow-300 text-[#f59e0b] focus:ring-[#f59e0b]" />
                    <span>I've read and acknowledge the <Link href="/privacy" target="_blank" className="text-[#f59e0b] font-semibold hover:underline">Privacy Notice</Link></span>
                  </label>
                </div>
                <Button type="submit" disabled={loading || !acceptTerms || !acceptPrivacy} className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full border-0 shadow-lg">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send OTP <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            )}

            {loginMethod === 'password' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#1a1a1a]">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className="pl-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                </div>
              </div>
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
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 chars, 1 uppercase, 1 number" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="pl-10 pr-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-amber-500 mt-1">Password must be at least 8 characters</p>
                )}
              </div>
              {/* CHILD-02: DOB — required for 18+ age gate */}
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-[#1a1a1a]">Date of Birth <span className="text-gray-400 font-normal">(must be 18+)</span></Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()}
                  className="h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]"
                />
              </div>
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-yellow-300 text-[#f59e0b] focus:ring-[#f59e0b]"
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-[#f59e0b] font-semibold hover:underline">
                      Terms of Service
                    </Link>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={acceptPrivacy}
                    onChange={(e) => setAcceptPrivacy(e.target.checked)}
                    required
                    className="mt-0.5 rounded border-yellow-300 text-[#f59e0b] focus:ring-[#f59e0b]"
                  />
                  <span>
                    I've read and acknowledge the{' '}
                    <Link href="/privacy" target="_blank" className="text-[#f59e0b] font-semibold hover:underline">
                      Privacy Notice
                    </Link>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={emailMarketingOptIn}
                    onChange={(e) => setEmailMarketingOptIn(e.target.checked)}
                    className="mt-0.5 rounded border-yellow-300 text-[#f59e0b] focus:ring-[#f59e0b]"
                  />
                  <span>Email me updates and offers (optional — you can change this anytime)</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading || !!success || !acceptTerms || !acceptPrivacy}
                className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full border-0 shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>
            )}

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-yellow-100" />
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm uppercase tracking-wider">Or continue with</span>
              <div className="flex-grow border-t border-yellow-100" />
            </div>

            <div className="space-y-3">
              <Button type="button" variant="outline" onClick={handleGoogleSignIn} className="w-full h-12 bg-white border border-gray-200 hover:bg-gray-50 text-[#1a1a1a] shadow-sm">
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>
              <Button type="button" variant="outline" onClick={handleAppleSignIn} className="w-full h-12 bg-white border border-gray-200 hover:bg-gray-50 text-[#1a1a1a] shadow-sm">
                <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.65.04 2.9.72 3.68 1.9-3.28 1.95-2.73 5.75.52 7.02-.75 1.86-1.74 3.2-2.87 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.38-2.07 4.29-3.74 4.25z" />
                </svg>
                Continue with Apple
              </Button>
            </div>

            <p className="text-center text-sm text-gray-500 pt-1">
              Already have an account?{' '}
              <Link href="/login" className="text-[#f59e0b] font-semibold hover:underline">Log in</Link>
            </p>
            <div className="mt-4 pt-4 border-t border-yellow-100">
              <p className="text-center text-sm font-medium text-gray-600">
                Are you a wellness practitioner?{' '}
                <Link href="/expert/signup" className="text-[#f59e0b] font-bold hover:underline">Apply here</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fffbf0] flex items-center justify-center p-8"><Loader2 className="w-8 h-8 text-[#f59e0b] animate-spin" /></div>}>
      <SignupInner />
    </Suspense>
  );
}

