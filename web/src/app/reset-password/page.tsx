'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const token        = searchParams.get('token') ?? '';

  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [status,          setStatus]          = useState<'idle' | 'success' | 'error'>('idle');
  const [message,         setMessage]         = useState('');

  // Live password strength checks
  const checks = {
    length:    password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  };
  const allValid = checks.length && checks.uppercase && checks.number;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');

    if (!token) {
      setStatus('error');
      setMessage('Reset token is missing. Please use the link from your email.');
      return;
    }
    if (!allValid) {
      setMessage('Please meet all password requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json() as { success: boolean; message: string };

      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Password reset successfully.');
        setTimeout(() => router.push('/login'), 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Reset failed. Please request a new link.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center max-w-md space-y-6">
        <XCircle className="h-16 w-16 text-red-400 mx-auto" />
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Invalid Reset Link</h1>
        <p className="text-gray-500">This reset link is invalid or has expired.</p>
        <Link href="/login">
          <Button className="bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 rounded-full px-8">
            Request a New Link
          </Button>
        </Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center max-w-md space-y-6">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Password Reset!</h1>
        <p className="text-gray-500">{message}</p>
        <p className="text-sm text-gray-400">Redirecting you to login...</p>
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
        <CardTitle className="text-2xl font-extrabold text-[#1a1a1a]">
          Set a new password
        </CardTitle>
        <CardDescription className="text-gray-500">
          Choose a strong password for your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Error banner */}
        {message && status === 'error' && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {message}
          </div>
        )}
        {/* Inline validation message */}
        {message && status === 'idle' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#1a1a1a]">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="pl-10 pr-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password strength checklist */}
            {password.length > 0 && (
              <ul className="space-y-1 mt-2">
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

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-[#1a1a1a]">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <Input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="pl-10 pr-10 h-12 border-yellow-200 focus-visible:ring-[#f59e0b] bg-[#fffbf0] text-[#1a1a1a]"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !allValid || password !== confirmPassword}
            className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full border-0 shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <><ShieldCheck className="h-4 w-4 mr-2" /> Reset Password</>
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          <Link href="/login" className="text-[#f59e0b] hover:underline">← Back to login</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
          <p className="text-gray-500">Loading...</p>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
