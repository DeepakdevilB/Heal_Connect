'use client';

import { Suspense, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle2, Phone, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const rawPhone = searchParams.get('phone') ?? '';
  // Ensure the + prefix is preserved (URL encoding can sometimes lose it)
  const phone = rawPhone && !rawPhone.startsWith('+') ? `+${rawPhone}` : rawPhone;

  // 6 individual digit inputs
  const [digits,   setDigits]   = useState<string[]>(Array(6).fill(''));
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join('');

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setError('');
    setLoading(true);

    try {
      const res  = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json() as { success: boolean; message: string };

      if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2500);
      } else {
        setError(data.message || 'Invalid OTP. Please try again.');
        setDigits(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setResending(true);
    setError('');

    try {
      await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
    } catch {}

    setResending(false);
    setDigits(Array(6).fill(''));
    inputRefs.current[0]?.focus();

    // 60-second cooldown
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  if (success) {
    return (
      <div className="text-center max-w-md space-y-6">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Phone Verified!</h1>
        <p className="text-gray-500">Your number has been verified. Redirecting to login...</p>
        <Link href="/login">
          <Button className="bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 rounded-full px-8">
            Go to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md bg-white border border-yellow-100 shadow-xl">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-[#f59e0b]">HealConnect</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-[#f59e0b]" />
          <CardTitle className="text-2xl font-extrabold text-[#1a1a1a]">Enter your OTP</CardTitle>
        </div>
        <CardDescription className="text-gray-500">
          We sent a 6-digit code to <strong>{phone || 'your phone'}</strong>.
          It expires in 5 minutes.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6-digit input boxes */}
          <div className="flex gap-2 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 border-yellow-200
                           bg-[#fffbf0] text-[#1a1a1a] focus:border-[#f59e0b] focus:outline-none
                           focus:ring-2 focus:ring-[#f59e0b]/30 transition-all"
              />
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full border-0 shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify OTP'}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Didn&apos;t receive it?</p>
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="flex items-center gap-1.5 mx-auto text-sm text-[#f59e0b] hover:underline disabled:opacity-50 disabled:no-underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-[#f59e0b] hover:underline">← Back to login</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
          <p className="text-gray-500">Loading...</p>
        </div>
      }>
        <VerifyOtpContent />
      </Suspense>
    </div>
  );
}
