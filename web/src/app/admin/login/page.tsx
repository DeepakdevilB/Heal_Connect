'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Shield, KeyRound, QrCode, CheckCircle2, RefreshCw } from 'lucide-react';

type Step = 'password' | 'mfa' | 'mfa-setup';

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loginToken, setLoginToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (d?.authenticated) router.replace('/admin/dashboard'); })
      .catch(() => {});
  }, [router]);

  // ── Step 1: email + password ──────────────────────────────────────────────
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as {
        success: boolean;
        mfaRequired?: boolean;
        mfaSetupRequired?: boolean;
        loginToken?: string;
        message?: string;
      };
      if (!res.ok || !data.success) {
        setError(data.message ?? 'Invalid admin credentials');
        return;
      }
      if (!data.mfaRequired) {
        // No MFA needed (MODERATOR without MFA set up)
        router.replace('/admin/dashboard');
        return;
      }
      setLoginToken(data.loginToken ?? '');
      if (data.mfaSetupRequired) {
        // First login — must set up TOTP
        setStep('mfa-setup');
        void loadQr(data.loginToken ?? '');
      } else {
        setStep('mfa');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Load QR for first-time setup ─────────────────────────────────────────
  const loadQr = async (token: string) => {
    setQrLoading(true);
    try {
      const res = await fetch('/api/admin/session/mfa', {
        headers: { 'x-login-token': token },
      });
      const data = await res.json() as { success: boolean; data?: { qrUrl: string; secret: string } };
      if (data.success && data.data) {
        setQrUrl(data.data.qrUrl);
        setSecret(data.data.secret);
      }
    } catch {
      setError('Failed to load QR code. Please try again.');
    } finally {
      setQrLoading(false);
    }
  };

  // ── Step 2/3: verify TOTP ────────────────────────────────────────────────
  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(mfaCode)) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/session/mfa', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginToken, code: mfaCode, setup: step === 'mfa-setup' }),
      });
      const data = await res.json() as { success: boolean; message?: string };
      if (!res.ok || !data.success) {
        setError(data.message ?? 'Invalid code');
        setMfaCode('');
        return;
      }
      router.replace('/admin/dashboard');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
            {step === 'password' ? (
              <Shield className="w-8 h-8 text-white" />
            ) : step === 'mfa' ? (
              <KeyRound className="w-8 h-8 text-white" />
            ) : (
              <QrCode className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-black text-white mb-1">HealConnect Admin</h1>
          <p className="text-white/50 text-sm font-medium">
            {step === 'password' && 'Secure Admin Panel — Authorized Access Only'}
            {step === 'mfa' && 'Enter your 6-digit authenticator code'}
            {step === 'mfa-setup' && 'Set up two-factor authentication'}
          </p>
        </div>

        {/* ── Step 1: Password form ── */}
        <AnimatePresence mode="wait">
          {step === 'password' && (
            <motion.form
              key="password-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handlePassword}
              className="space-y-5"
            >
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-white/60 mb-1.5 block">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    id="admin-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@healconnect.com"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-white/60 mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    id="admin-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/30 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass((p) => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors" tabIndex={-1}>
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

              <button
                id="admin-login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all hover:shadow-xl"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>
                  <Shield className="w-4 h-4" /> Sign in to Admin Panel
                </>}
              </button>
            </motion.form>
          )}

          {/* ── Step 2: TOTP verify ── */}
          {step === 'mfa' && (
            <motion.form
              key="mfa-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleMfa}
              className="space-y-5"
            >
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-white/60 mb-1.5 block">
                  Authenticator Code
                </label>
                <input
                  id="admin-mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  autoComplete="one-time-code"
                  className="w-full text-center text-3xl font-black tracking-[0.4em] px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                />
                <p className="text-white/40 text-xs text-center mt-2">Open your authenticator app and enter the 6-digit code</p>
              </div>

              {error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

              <button
                id="admin-mfa-submit"
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>
                  <CheckCircle2 className="w-4 h-4" /> Verify & Sign In
                </>}
              </button>

              <button type="button" onClick={() => setStep('password')} className="w-full text-white/40 hover:text-white/60 text-xs text-center transition-colors py-2">
                ← Back to password
              </button>
            </motion.form>
          )}

          {/* ── Step 3: MFA setup (first login) ── */}
          {step === 'mfa-setup' && (
            <motion.div
              key="mfa-setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div className="text-center text-white/70 text-sm leading-relaxed">
                <p className="font-semibold text-white mb-2">Set up two-factor authentication</p>
                <p className="text-white/50 text-xs">Scan the QR code with Google Authenticator or Authy, then enter the 6-digit code below to confirm.</p>
              </div>

              {qrLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              ) : qrUrl ? (
                <div className="bg-white rounded-2xl p-4 mx-auto w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="TOTP QR Code" width={200} height={200} />
                </div>
              ) : null}

              {secret && (
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center">
                  <p className="text-white/40 text-xs mb-1">Manual entry key</p>
                  <p className="text-white font-mono text-sm tracking-widest">{secret}</p>
                </div>
              )}

              <form onSubmit={handleMfa} className="space-y-3">
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-white/60 mb-1.5 block">
                    Confirm with Code
                  </label>
                  <input
                    id="admin-mfa-setup-code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full text-center text-3xl font-black tracking-[0.4em] px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                  />
                </div>

                {error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold px-4 py-3 rounded-2xl">{error}</div>}

                <button
                  id="admin-mfa-setup-confirm"
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-amber-500/30 transition-all"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>
                    <CheckCircle2 className="w-4 h-4" /> Enable MFA & Sign In
                  </>}
                </button>

                <button type="button" onClick={() => setStep('password')} className="w-full text-white/40 hover:text-white/60 text-xs text-center transition-colors py-2">
                  ← Back to password
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-white/30 text-xs mt-6">
          This panel is restricted to authorized administrators only.
        </p>
      </motion.div>
    </div>
  );
}
