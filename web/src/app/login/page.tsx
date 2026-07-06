'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, ArrowRight, ShieldCheck, Star, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, tokenStore } from '@/lib/api';

type Mode = 'login' | 'forgot';

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Email / Password Login ─────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });

      if (!res.success || !res.data) {
        setError(res.message || 'Login failed');
        return;
      }

      tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Forgot Password ────────────────────────────────────────────────────────

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email);
      setSuccess(res.message || 'Check your email for a reset link.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Google Sign-In ─────────────────────────────────────────────────────────

  function handleGoogleSignIn() {
    // Redirect to Google OAuth — replace with your Google client ID
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/google/callback`);
    const scope = encodeURIComponent('openid email profile');
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=id_token&scope=${scope}&nonce=${Math.random().toString(36)}`;

    if (!clientId) {
      setError('Google Sign-In is not configured yet.');
      return;
    }
    window.location.href = googleUrl;
  }

  // ─── Apple Sign-In ──────────────────────────────────────────────────────────

  function handleAppleSignIn() {
    setError('Apple Sign-In requires native SDK configuration.');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans">

      {/* Left Column — Branding */}
      <div className="hidden md:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950 border-r border-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              HealConnect
            </span>
          </Link>

          <h1 className="text-4xl lg:text-5xl font-extrabold dark:text-white text-slate-900 mb-6 leading-tight tracking-tight">
            Begin your journey <br /> to inner peace.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed mb-12">
            Join the community of over 50,000 members receiving guidance from world-class verified practitioners.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="dark:text-white text-slate-900 font-medium">100% Private & Secure</p>
                <p className="text-sm text-muted-foreground">Your data and conversations are encrypted.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="dark:text-white text-slate-900 font-medium">Verified Experts</p>
                <p className="text-sm text-muted-foreground">Rigorous 5-step background checks.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto pt-12 border-t border-border/50">
          <p className="text-muted-foreground text-sm">© 2026 Tara Infotech. All rights reserved.</p>
        </div>
      </div>

      {/* Right Column — Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute top-6 left-6 md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="text-xl font-bold dark:text-white text-slate-900">HealConnect</span>
          </Link>
        </div>

        <Card className="w-full max-w-md bg-muted/50 border-border shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-2xl font-bold dark:text-white text-slate-900 tracking-tight">
              {mode === 'login' ? 'Log in to your account' : 'Reset your password'}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              {mode === 'login'
                ? 'Welcome back! Enter your credentials to continue.'
                : 'Enter your email to receive a password reset link.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Error / Success banners */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-400">
                {success}
              </div>
            )}

            {/* ── Login Form ── */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="pl-10 bg-background border-border dark:text-white text-slate-900 h-12 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground">Password</Label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                      className="text-sm text-indigo-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-10 pr-10 bg-background border-border dark:text-white text-slate-900 h-12 focus-visible:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-semibold shadow-[0_0_20px_-5px_rgba(79,70,229,0.4)] border-0"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Log in <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </form>
            )}

            {/* ── Forgot Password Form ── */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-background border-border dark:text-white text-slate-900 h-12 focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base font-semibold border-0"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
                </Button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                  className="w-full text-center text-sm text-indigo-400 hover:underline"
                >
                  ← Back to login
                </button>
              </form>
            )}

            {mode === 'login' && (
              <>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-border" />
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-sm font-medium uppercase tracking-wider">Or continue with</span>
                  <div className="flex-grow border-t border-border" />
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    className="w-full h-12 bg-background border-border hover:bg-card dark:text-white text-slate-900 transition-colors"
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAppleSignIn}
                    className="w-full h-12 bg-background border-border hover:bg-card dark:text-white text-slate-900 transition-colors"
                  >
                    <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.04 2.26-.79 3.59-.76 1.65.04 2.9.72 3.68 1.9-3.28 1.95-2.73 5.75.52 7.02-.75 1.86-1.74 3.2-2.87 3.99zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.38-2.07 4.29-3.74 4.25z" />
                    </svg>
                    Continue with Apple
                  </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground pt-2">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="text-indigo-400 font-semibold hover:underline">
                    Sign up
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
