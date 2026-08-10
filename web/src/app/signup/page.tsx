'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, ShieldCheck, Star, Eye, EyeOff, Loader2, Sparkles, Phone, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, tokenStore } from '@/lib/api';

type Role = 'user' | 'expert';
type VerifyMethod = 'email' | 'phone';

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>('user');
  const [verifyMethod, setVerifyMethod] = useState<VerifyMethod>('email');

  useEffect(() => {
    if (searchParams.get('role') === 'expert') setRole('expert');
  }, [searchParams]);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone & Twilio OTP state
  const [countryCode, setCountryCode] = useState('+91');
  const [rawPhone, setRawPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'details' | 'otp_verify'>('details');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  // UI status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 60-second Resend Timer countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const fullPhoneNumber = `${countryCode}${rawPhone.replace(/\D/g, '')}`;

  // Option 1: Handle Email Signup (Existing Email Verification Flow)
  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const pwdOk = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
    if (!pwdOk) { setError('Password must be min. 8 chars, 1 uppercase, 1 number.'); setLoading(false); return; }

    try {
      if (role === 'expert') {
        const res = await authApi.practitionerRegister(name, email, password);
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
        const res = await authApi.register({ name, email, password });
        if (!res.success || !res.data) {
          setError(res.errors?.length ? res.errors.map((e) => e.message).join(' · ') : res.message || 'Registration failed');
          return;
        }
        tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        localStorage.removeItem('hc_role');
        localStorage.removeItem('hc_practitioner_id');
        localStorage.removeItem('hc_pid');
        localStorage.removeItem('hc_practitioner_name');
        setSuccess('Account created! Verification link sent to your email.');
        setTimeout(() => router.push(`/verify-email/pending?email=${encodeURIComponent(email)}`), 1200);
      }
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setLoading(false); }
  }

  // Option 2: Step 1 — Send OTP via Twilio Verify Service
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) { setError('Full Name is required.'); return; }
    if (!email.trim() || !email.includes('@')) { setError('Valid Email Address is required.'); return; }

    const pwdOk = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
    if (!pwdOk) { setError('Password must be min 8 characters, with 1 uppercase letter and 1 number.'); return; }

    if (!rawPhone || rawPhone.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid Phone Number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhoneNumber }),
      }).then((r) => r.json());

      if (res.success) {
        setOtpStep('otp_verify');
        setResendTimer(60);
        setSuccess(`OTP sent to ${fullPhoneNumber} via SMS`);
      } else {
        setError(res.message || 'Failed to send OTP via Twilio Verify.');
      }
    } catch {
      setError('Service error. Could not send OTP.');
    } finally {
      setLoading(false);
    }
  }

  // Option 2: Step 2 — Verify OTP using Twilio Verify & Create Account
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!otp || otp.trim().length < 4) {
      setError('Please enter the 6-digit OTP received via SMS.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: fullPhoneNumber,
          otp: otp.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      }).then((r) => r.json());

      if (res.verified && res.data) {
        tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
        localStorage.removeItem('hc_role');
        localStorage.removeItem('hc_practitioner_id');
        localStorage.removeItem('hc_pid');
        localStorage.removeItem('hc_practitioner_name');
        setSuccess('OTP approved! Account created successfully. Redirecting...');
        setTimeout(() => router.push('/dashboard'), 600);
      } else {
        setError(res.message || 'Invalid or expired OTP. Account not created.');
      }
    } catch {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
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
            Start your journey <br /> to holistic wellness.
          </h1>
          <p className="text-lg text-yellow-100 max-w-md leading-relaxed mb-12">
            Create your account and connect with top verified experts.
          </p>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">100% Confidential</p>
                <p className="text-sm text-yellow-100">End-to-end encrypted consultations.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Verified Experts</p>
                <p className="text-sm text-yellow-100">Top-rated astrologers and wellness guides.</p>
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
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-2xl font-extrabold text-[#1a1a1a]">
              Create your account
            </CardTitle>
            <CardDescription className="text-gray-500 text-sm">
              {otpStep === 'details' ? 'Select your preferred verification method to get started.' : `Enter the 6-digit OTP sent to ${fullPhoneNumber}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Role Selector */}
            {otpStep === 'details' && (
              <div className="flex rounded-xl border border-yellow-200 overflow-hidden bg-[#fffbf0] p-1 gap-1">
                <button type="button" onClick={() => { setRole('user'); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    role === 'user' ? 'bg-[#f59e0b] text-white shadow' : 'text-gray-500 hover:text-[#f59e0b]'}`}>
                  <User className="w-3.5 h-3.5" /> User
                </button>
                <button type="button" onClick={() => { setRole('expert'); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                    role === 'expert' ? 'bg-[#f59e0b] text-white shadow' : 'text-gray-500 hover:text-[#f59e0b]'}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Expert
                </button>
              </div>
            )}

            {/* Verification Method Toggle (Option 1: Email vs Option 2: Phone Twilio) */}
            {role === 'user' && otpStep === 'details' && (
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <p className="text-xs font-extrabold text-amber-900">Verification Method:</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    verifyMethod === 'email' ? 'bg-white border-[#f59e0b] text-[#f59e0b] shadow-sm' : 'border-amber-200/60 text-gray-600 hover:bg-white/50'}`}>
                    <input type="radio" name="verifyMethod" value="email" checked={verifyMethod === 'email'} onChange={() => setVerifyMethod('email')} className="accent-[#f59e0b]" />
                    <Mail className="w-3.5 h-3.5" /> Verify by Email
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    verifyMethod === 'phone' ? 'bg-white border-[#f59e0b] text-[#f59e0b] shadow-sm' : 'border-amber-200/60 text-gray-600 hover:bg-white/50'}`}>
                    <input type="radio" name="verifyMethod" value="phone" checked={verifyMethod === 'phone'} onChange={() => setVerifyMethod('phone')} className="accent-[#f59e0b]" />
                    <Phone className="w-3.5 h-3.5" /> Verify by Phone (SMS)
                  </label>
                </div>
              </div>
            )}

            {error && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">{error}</div>}
            {success && <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs font-semibold text-green-700">{success}</div>}

            {/* DETAILS STEP */}
            {otpStep === 'details' ? (
              <form onSubmit={verifyMethod === 'email' || role === 'expert' ? handleEmailSignup : handleSendOtp} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-[#1a1a1a] text-xs font-bold">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="name" type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="pl-9 h-10 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-[#1a1a1a] text-xs font-bold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9 h-10 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-xs" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-[#1a1a1a] text-xs font-bold">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="pl-9 pr-10 h-10 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-xs" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">Min. 8 chars, 1 uppercase, 1 number.</p>
                </div>

                {role === 'user' && verifyMethod === 'phone' && (
                  <div className="space-y-1 pt-1">
                    <Label htmlFor="phone" className="text-[#1a1a1a] text-xs font-bold">Mobile Number (Country Code + Phone)</Label>
                    <div className="flex gap-2">
                      <div className="w-24 shrink-0">
                        <Input
                          type="text"
                          placeholder="+44"
                          value={countryCode}
                          onChange={(e) => {
                            let val = e.target.value.trim();
                            if (!val.startsWith('+')) val = '+' + val;
                            setCountryCode(val);
                          }}
                          className="h-10 text-center font-bold border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-xs"
                          title="Enter country code (e.g. +44, +91, +1)"
                        />
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="7700900123"
                          value={rawPhone}
                          onChange={(e) => setRawPhone(e.target.value)}
                          required
                          className="pl-9 h-10 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500">Supports all 200+ countries worldwide in E.164 format (e.g. +447700900123).</p>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-11 mt-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold rounded-xl shadow-md text-sm">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : verifyMethod === 'email' || role === 'expert' ? (
                    'Create Account →'
                  ) : (
                    'Send Phone OTP →'
                  )}
                </Button>
              </form>
            ) : (
              /* OTP VERIFICATION STEP */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-semibold flex items-center justify-between">
                  <span>Sending OTP to: <strong>{fullPhoneNumber}</strong></span>
                  <button type="button" onClick={() => setOtpStep('details')} className="text-[#f59e0b] font-bold underline">Edit Details</button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-[#1a1a1a] text-xs font-bold">Enter 6-Digit OTP Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="h-12 text-center text-xl font-mono tracking-widest border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0]"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full h-11 bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold rounded-xl shadow-md text-sm">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP & Complete Signup →'}
                </Button>

                {/* 60-Second Resend Timer */}
                <div className="text-center pt-2">
                  {resendTimer > 0 ? (
                    <p className="text-xs text-gray-500 font-semibold">Resend OTP in <span className="font-bold text-[#f59e0b]">{resendTimer}s</span></p>
                  ) : (
                    <button type="button" onClick={handleSendOtp} disabled={loading} className="text-xs font-extrabold text-[#f59e0b] hover:underline">
                      Didn't receive code? Resend OTP Now
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 font-medium">
                Already have an account?{' '}
                <Link href="/login" className="font-extrabold text-[#f59e0b] hover:underline">
                  Log in
                </Link>
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
    <Suspense fallback={<div className="min-h-screen bg-[#fffbf0] flex items-center justify-center text-amber-600 font-bold">Loading...</div>}>
      <SignupInner />
    </Suspense>
  );
}
