'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { astrologerAuthApi, astrologerTokenStore } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Star, Sparkles, Users, TrendingUp, ArrowRight, ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', name: 'India' },
  { code: '+1',  name: 'USA' },
  { code: '+44', name: 'UK' },
  { code: '+971', name: 'UAE' },
  { code: '+65', name: 'Singapore' },
  { code: '+61', name: 'Australia' },
  { code: '+60', name: 'Malaysia' },
];

type Step = 'phone' | 'otp';

export default function AstrologerLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const phone = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [devHint, setDevHint] = useState('');

  const startCooldown = () => {
    setCooldown(60);
    const t = setInterval(() => {
      setCooldown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) { setError('Enter your mobile number.'); return; }
    if (!/^\d{7,15}$/.test(phoneNumber.replace(/\s+/g, ''))) { setError('Enter a valid mobile number.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await astrologerAuthApi.sendOtp(phone, 'login');
      if (!res.success) { setError(res.message || 'Failed to send OTP.'); return; }
      if ((res as any).devOtp) setDevHint(`DEV: Use OTP ${(res as any).devOtp}`);
      setStep('otp');
      startCooldown();
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) { setError('Enter the OTP.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await astrologerAuthApi.verifyOtp(phone, otp, 'login');
      if (!res.success || !res.data) { setError(res.message || 'Invalid OTP.'); return; }
      astrologerTokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      astrologerTokenStore.setProfile(res.data.astrologer);
      if (typeof window !== 'undefined') localStorage.setItem('hca_phone', phone);
      router.push(res.data.redirect);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await astrologerAuthApi.sendOtp(phone, 'login');
      if (!res.success) { setError(res.message || 'Failed to resend OTP.'); return; }
      startCooldown();
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  };

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

        {/* Mobile logo */}
        <div className="absolute top-6 left-6 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
          </Link>
        </div>

        <div className="w-full max-w-md mt-12 md:mt-0">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4 md:hidden">
              <Star className="w-4 h-4" /> Astrologer Portal
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {step === 'phone' ? 'Sign in to your account' : 'Enter verification code'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 'phone'
                ? 'Enter your mobile number to receive an OTP'
                : `We sent a 6-digit code to ${phone}`}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 p-8">
            {devHint && (
              <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm font-mono">{devHint}</div>
            )}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {step === 'phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[#1a1a1a] font-medium">Mobile Number</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="h-12 pl-3 pr-8 rounded-lg border border-yellow-200 bg-[#fffbf0] text-[#1a1a1a] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none cursor-pointer"
                      >
                        {COUNTRY_CODES.map((c, i) => (
                          <option key={i} value={c.code}>{c.code}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-4 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="98765 43210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                      className="flex-1 h-12 border-yellow-200 focus-visible:ring-amber-400 bg-[#fffbf0] text-[#1a1a1a]"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-base shadow-lg border-0">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Send OTP <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-[#1a1a1a] font-medium">6-Digit OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="h-12 text-center text-2xl tracking-[0.5em] border-yellow-200 focus-visible:ring-amber-400 bg-[#fffbf0] text-[#1a1a1a] font-bold"
                    required
                  />
                  <p className="text-xs text-gray-400">OTP is valid for 10 minutes</p>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-base shadow-lg border-0">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Verify & Sign In <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <div className="flex items-center justify-between text-sm pt-1">
                  <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                    className="text-gray-500 hover:text-gray-700">
                    ← Change number
                  </button>
                  <button type="button" onClick={handleResend} disabled={cooldown > 0 || loading}
                    className="text-amber-600 hover:text-amber-700 disabled:text-gray-400 disabled:cursor-not-allowed font-medium">
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}


          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure OTP authentication · No password required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
