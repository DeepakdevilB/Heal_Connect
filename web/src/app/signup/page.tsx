'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, User, Phone, ArrowRight, ShieldCheck,
  Star, Eye, EyeOff, Loader2,
} from 'lucide-react';
import { Button }   from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import { authApi, tokenStore } from '@/lib/api';

type VerifyMethod = 'email' | 'sms';

export default function SignupPage() {
  const router = useRouter();

  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>('email');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');

  // Password strength
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  };
  const passwordOk = checks.length && checks.uppercase && checks.number;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!passwordOk) { setError('Please meet all password requirements.'); return; }
    if (verifyMethod === 'sms' && !phone) { setError('Phone number is required for SMS verification.'); return; }

    setLoading(true);
    try {
      const res = await authApi.register({
        name,
        email,
        password,
        ...(phone ? { phone } : {}),
        verifyMethod,
      });

      if (!res.success || !res.data) {
        setError(
          res.errors?.length
            ? res.errors.map((e) => e.message).join(' · ')
            : res.message || 'Registration failed'
        );
        return;
      }

      tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      setSuccess(res.message || 'Account created!');

      const method = res.data.verifyMethod as VerifyMethod | undefined;

      if (method === 'sms' && phone) {
        setTimeout(() => router.push(`/verify-otp?phone=${encodeURIComponent(phone)}`), 1500);
      } else {
        // Email verify — redirect to a "check your inbox" holding page
        setTimeout(() => router.push(`/verify-email/pending?email=${encodeURIComponent(email)}`), 1500);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    if (!clientId) { setError('Google Sign-In is not configured yet.'); return; }
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
    const scope       = encodeURIComponent('openid email profile');
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=id_token&scope=${scope}&nonce=${Math.random().toString(36)}`;
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
            <CardDescription className="text-gray-500 text-base">
              Sign up and get your first session free.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 space-y-1">
                <p className="font-semibold">✓ Account created successfully!</p>
                <p className="text-green-600">
                  {verifyMethod === 'sms'
                    ? 'Redirecting to OTP verification...'
                    : 'A verification email has been sent. Please verify your email before logging in.'}
                </p>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#1a1a1a]">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input id="name" type="text" placeholder="John Doe" value={name}
                    onChange={(e) => setName(e.target.value)} required autoComplete="name"
                    className="pl-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1a1a1a]">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                    className="pl-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1a1a1a]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <Input id="password" type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required autoComplete="new-password"
                    className="pl-10 pr-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <ul className="space-y-1 mt-1">
                    {[
                      { ok: checks.length,    label: 'At least 8 characters' },
                      { ok: checks.uppercase, label: 'One uppercase letter'  },
                      { ok: checks.number,    label: 'One number'            },
                    ].map(({ ok, label }) => (
                      <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                        <span>{ok ? '✓' : '○'}</span> {label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Verification Method */}
              <div className="space-y-2">
                <Label className="text-[#1a1a1a]">Verify account via</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['email', 'sms'] as VerifyMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setVerifyMethod(m)}
                      className={`flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold border-2 transition-all
                        ${verifyMethod === m
                          ? 'border-[#f59e0b] bg-yellow-50 text-[#d97706]'
                          : 'border-yellow-100 bg-white text-gray-500 hover:border-yellow-300'}`}
                    >
                      {m === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                      {m === 'email' ? 'Email' : 'SMS OTP'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone (shown when SMS selected) */}
              {verifyMethod === 'sms' && (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[#1a1a1a]">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <Input id="phone" type="tel"
                      placeholder="+919878349038"
                      value={phone}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^\d+]/g, '');
                        // Auto-add + if user starts typing digits
                        if (v && !v.startsWith('+')) v = '+' + v;
                        setPhone(v);
                      }}
                      required={verifyMethod === 'sms'}
                      autoComplete="tel"
                      className="pl-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]" />
                  </div>
                  <p className="text-xs text-gray-400">Include country code — e.g. +919878349038 for India, +447911123456 for UK</p>
                </div>
              )}

              <Button type="submit" disabled={loading || !!success || !passwordOk}
                className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full border-0 shadow-lg disabled:opacity-50">
                {loading
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <>Create Account <ArrowRight className="ml-2 h-4 w-4" /></>}
              </Button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-yellow-100" />
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-yellow-100" />
            </div>

            <Button type="button" variant="outline" onClick={handleGoogleSignIn}
              className="w-full h-12 bg-white border border-gray-200 hover:bg-gray-50 text-[#1a1a1a] shadow-sm">
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <p className="text-center text-sm text-gray-500 pt-1">
              Already have an account?{' '}
              <Link href="/login" className="text-[#f59e0b] font-semibold hover:underline">Log in</Link>
            </p>
            <p className="text-center text-xs text-gray-400">
              By continuing, you agree to our{' '}
              <Link href="#" className="hover:underline">Terms</Link> and{' '}
              <Link href="#" className="hover:underline">Privacy Policy</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
