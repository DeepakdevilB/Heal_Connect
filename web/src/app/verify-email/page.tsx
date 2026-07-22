'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Uses Next.js proxy rewrite — same as the rest of the app (see next.config.mjs)
const API_URL = '';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token');

  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please use the link from your email.');
      return;
    }

    fetch(`${API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: { success: boolean; message: string }) => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          setTimeout(() => router.push('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [token, router]);

  return (
    <Card className="w-full max-w-md bg-white border border-yellow-100 shadow-xl text-center">
      <CardContent className="pt-10 pb-8 px-8 space-y-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-[#f59e0b]">HealConnect</span>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className="space-y-4 py-4">
            <Loader2 className="h-14 w-14 animate-spin text-[#f59e0b] mx-auto" />
            <p className="text-gray-500 text-base">Verifying your email…</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="space-y-4">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h1 className="text-2xl font-extrabold text-[#1a1a1a]">Email Verified!</h1>
            <p className="text-gray-500">{message}</p>
            <p className="text-sm text-gray-400">Redirecting you to login in 3 seconds…</p>
            <Link href="/login"
              className="flex items-center justify-center w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full shadow-lg transition-colors">
              Go to Login
            </Link>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="space-y-4">
            <XCircle className="h-16 w-16 text-red-400 mx-auto" />
            <h1 className="text-2xl font-extrabold text-[#1a1a1a]">Verification Failed</h1>
            <p className="text-gray-500">{message}</p>
            <div className="space-y-2">
              <Link href="/login"
                className="flex items-center justify-center w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full shadow-lg transition-colors">
                Go to Login
              </Link>
              <p className="text-sm text-gray-400">
                Need a new link?{' '}
                <Link href="/login" className="text-[#f59e0b] hover:underline font-semibold">
                  Request from login page
                </Link>
              </p>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
          <p className="text-gray-500">Loading…</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
