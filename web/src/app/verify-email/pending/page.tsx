'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, RotateCcw, Loader2 } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';

// Uses Next.js proxy rewrite — same as the rest of the app (see next.config.mjs)
const API_URL = '';

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [resending,  setResending]  = useState(false);
  const [cooldown,   setCooldown]   = useState(0);
  const [resendMsg,  setResendMsg]  = useState('');

  async function handleResend() {
    if (cooldown > 0 || !email) return;
    setResending(true);
    setResendMsg('');

    try {
      const res  = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      const data = (await res.json()) as { success: boolean; message: string };
      setResendMsg(data.message || 'Verification email sent!');
    } catch {
      setResendMsg('Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }

    // 60-second cooldown to prevent spam
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <Card className="w-full max-w-md bg-white border border-yellow-100 shadow-xl">
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-[#f59e0b]">HealConnect</span>
        </div>

        {/* Envelope icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 border-2 border-yellow-200 mx-auto">
          <Mail className="h-8 w-8 text-[#f59e0b]" />
        </div>

        <CardTitle className="text-2xl font-extrabold text-[#1a1a1a] text-center">
          Check your inbox
        </CardTitle>
        <CardDescription className="text-gray-500 text-center text-base">
          We&apos;ve sent a verification link to{' '}
          <span className="font-semibold text-[#1a1a1a]">{email || 'your email'}</span>.
          <br />
          Click the link to activate your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Steps */}
        <ol className="space-y-3 text-sm text-gray-600">
          {[
            'Open the email from HealConnect.',
            'Click the "Verify Email" button in the email.',
            'You\'ll be redirected to the login page.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-[#d97706] font-bold text-xs flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Can&apos;t find it? Check your <strong>spam / junk</strong> folder.
        </div>

        {/* Resend */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">Didn&apos;t receive the email?</p>
          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="flex items-center gap-1.5 mx-auto text-sm text-[#f59e0b] hover:underline disabled:opacity-50 disabled:no-underline font-semibold"
          >
            {resending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RotateCcw className="h-3.5 w-3.5" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Resend verification email'}
          </button>
          {resendMsg && (
            <p className="text-xs text-emerald-600 font-medium">{resendMsg}</p>
          )}
        </div>

        <Link href="/login"
          className="flex items-center justify-center w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full shadow-lg transition-colors">
          Go to Login
        </Link>

        <p className="text-center text-xs text-gray-400">
          Wrong email?{' '}
          <Link href="/signup" className="text-[#f59e0b] hover:underline font-semibold">
            Sign up again
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
          <p className="text-gray-500">Loading…</p>
        </div>
      }>
        <PendingContent />
      </Suspense>
    </div>
  );
}
