'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sparkles, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    fetch(`${API_URL}/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data: { success: boolean; message: string }) => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          setTimeout(() => router.push('/login'), 3000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [token, router]);

  return (
    <div className="text-center max-w-md space-y-6">
      <Link href="/" className="flex items-center gap-2 justify-center mb-8">
        <Sparkles className="h-6 w-6 text-indigo-400" />
        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          HealConnect
        </span>
      </Link>

      {status === 'loading' && (
        <>
          <Loader2 className="h-12 w-12 animate-spin text-indigo-400 mx-auto" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Email Verified!</h1>
          <p className="text-muted-foreground">{message}</p>
          <p className="text-sm text-slate-500">Redirecting you to login...</p>
          <Link href="/login">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">Go to Login</Button>
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="h-16 w-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Verification Failed</h1>
          <p className="text-muted-foreground">{message}</p>
          <Link href="/login">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">Back to Login</Button>
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
