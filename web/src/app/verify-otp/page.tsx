'use client';

import { Suspense, useRef, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, CheckCircle2, Phone, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

const API_URL = '';

function VerifyOtpContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const rawPhone = searchParams.get('phone') ?? '';
  // Ensure the + prefix is preserved (URL encoding can sometimes lose it)
  const phone = rawPhone && !rawPhone.startsWith('+') ? `+${rawPhone}` : rawPhone;

  // 6 individual digit inputs (Twilio Verify default)
  const [digits,   setDigits]   = useState<string[]>(Array(6).fill(''));
  const [loading,  setLoading]  = useState(false);
  const [resending, setResending] = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isOrbiting, setIsOrbiting] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(false);
  const [activeFocus, setActiveFocus] = useState<number | null>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join('');

  // Auto-focus first input on load
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigit(index: number, value: string) {
    if (isOrbiting || loading) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    
    if (digit) {
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
        setActiveFocus(index + 1);
      } else {
        // Blur and start verification flow
        inputRefs.current[index]?.blur();
        setActiveFocus(null);
        triggerVerificationFlow(next.join(''));
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (isOrbiting || loading) return;
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
        setActiveFocus(index - 1);
      } else {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (isOrbiting || loading) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const splitDigits = pasted.split('');
      setDigits(splitDigits);
      inputRefs.current[5]?.focus();
      setActiveFocus(5);
      triggerVerificationFlow(pasted);
    }
    e.preventDefault();
  }

  // Pre-calculated orbital keyframe coordinates centered at (0, 0)
  const getOrbitKeyframes = (index: number) => {
    const xOrig = (index - 2.5) * 52; // Spacing: width 44px + gap 8px = 52px
    const R = 44; // Orbit radius
    const startAngle = (index * Math.PI) / 3; // Evenly distributed at 60 degrees

    const xVals = [0, R * Math.cos(startAngle) - xOrig];
    const yVals = [0, R * Math.sin(startAngle) - 12];
    const rotVals = [0, 15];

    // 360 degree rotation points
    for (let step = 1; step <= 4; step++) {
      const angle = startAngle + (step * 2 * Math.PI) / 4;
      xVals.push(R * Math.cos(angle) - xOrig);
      yVals.push(R * Math.sin(angle) - 12);
      rotVals.push(15 * (step % 2 === 0 ? 1 : -1));
    }

    // Return to start
    xVals.push(0);
    yVals.push(0);
    rotVals.push(0);

    return { x: xVals, y: yVals, rotate: rotVals };
  };

  async function triggerVerificationFlow(otpCode: string) {
    if (otpCode.length !== 6) return;
    setError('');
    setIsOrbiting(true);

    // Wait for the orbit animation to complete (approx 850ms)
    setTimeout(async () => {
      // 🧪 Dev Testing Mode Bypasses:
      if (otpCode === '123456') {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
        return;
      }
      if (otpCode === '000000') {
        setError('Invalid OTP. Please try again (Simulated Failure).');
        setDigits(Array(6).fill(''));
        setShakeTrigger(true);
        // Auto reset shake trigger
        setTimeout(() => setShakeTrigger(false), 600);
        setIsOrbiting(false);
        setLoading(false);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
          setActiveFocus(0);
        }, 100);
        return;
      }

      setLoading(true);
      try {
        const res  = await fetch(`${API_URL}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp: otpCode }),
        });
        const data = await res.json() as { success: boolean; message: string };

        if (data.success) {
          setSuccess(true);
          setTimeout(() => router.push('/login'), 2000);
        } else {
          setError(data.message || 'Invalid OTP. Please try again.');
          setDigits(Array(6).fill(''));
          setShakeTrigger(true);
          // Auto reset shake trigger
          setTimeout(() => setShakeTrigger(false), 600);
          setIsOrbiting(false);
          setLoading(false);
          setTimeout(() => {
            inputRefs.current[0]?.focus();
            setActiveFocus(0);
          }, 100);
        }
      } catch {
        setError('Something went wrong. Please try again.');
        setDigits(Array(6).fill(''));
        setShakeTrigger(true);
        setTimeout(() => setShakeTrigger(false), 600);
        setIsOrbiting(false);
        setLoading(false);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
          setActiveFocus(0);
        }, 100);
      }
    }, 850);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) { setError('Please enter all 6 digits.'); return; }
    triggerVerificationFlow(otp);
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
    setActiveFocus(0);

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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="text-center max-w-md space-y-6 bg-white p-8 rounded-3xl border border-yellow-100 shadow-xl"
      >
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500">
          <CheckCircle2 className="h-10 w-10 animate-bounce" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1a1a1a]">Phone Verified!</h1>
        <p className="text-gray-500">Your number has been verified. Redirecting to login...</p>
        <Link href="/login">
          <Button className="bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 rounded-full px-8 py-2.5 font-bold shadow-md transition-transform hover:scale-105 active:scale-95">
            Go to Login
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card className="w-full max-w-md bg-white border border-yellow-100 shadow-xl relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-[#f59e0b]" />
              <p className="text-sm font-semibold text-gray-600">Verifying code...</p>
            </div>
          </div>
        )}

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
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 font-semibold text-center flex flex-col gap-1">
            <span>🧪 Dev Testing Mode Enabled</span>
            <span className="font-normal text-amber-600">Enter <strong className="font-bold text-amber-800">123456</strong> to simulate Success or <strong className="font-bold text-amber-800">000000</strong> to simulate Failure</span>
          </div>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* 6-digit input boxes with orbit animation */}
            <motion.div 
              animate={shakeTrigger ? { x: [0, -10, 10, -10, 10, -5, 5, 0] } : {}}
              transition={{ duration: 0.5 }}
              className="flex gap-2 justify-center py-4 relative" 
              onPaste={handlePaste}
            >
              {digits.map((d, i) => {
                const kf = getOrbitKeyframes(i);
                const isActive = activeFocus === i;
                const isError = !!error;

                return (
                  <motion.input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    disabled={isOrbiting || loading}
                    onChange={(e) => handleDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onFocus={() => setActiveFocus(i)}
                    onBlur={() => setActiveFocus(null)}
                    animate={isOrbiting ? {
                      x: kf.x,
                      y: kf.y,
                      rotate: kf.rotate,
                      scale: [1, 1.05, 1.05, 1.05, 1.05, 1.05, 1],
                      boxShadow: [
                        "0px 4px 6px -1px rgba(0,0,0,0.05)",
                        "0px 8px 16px rgba(245, 158, 11, 0.4)",
                        "0px 8px 16px rgba(245, 158, 11, 0.4)",
                        "0px 8px 16px rgba(245, 158, 11, 0.4)",
                        "0px 8px 16px rgba(245, 158, 11, 0.4)",
                        "0px 8px 16px rgba(245, 158, 11, 0.4)",
                        "0px 4px 6px -1px rgba(0,0,0,0.05)"
                      ]
                    } : {
                      scale: isActive ? 1.06 : 1,
                      borderColor: isError ? "#ef4444" : (isActive ? "#f59e0b" : "#fef08a"),
                      boxShadow: isError
                        ? "0 0 0 3px rgba(239, 68, 68, 0.15)"
                        : (isActive ? "0 0 0 3px rgba(245, 158, 11, 0.25)" : "0px 2px 4px rgba(0, 0, 0, 0.02)"),
                    }}
                    transition={isOrbiting ? {
                      duration: 0.85,
                      ease: "easeInOut",
                      times: [0, 0.15, 0.32, 0.49, 0.66, 0.83, 1]
                    } : {
                      type: 'spring',
                      stiffness: 300,
                      damping: 20
                    }}
                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2
                               bg-[#fffbf0] text-[#1a1a1a] focus:outline-none transition-colors
                               ${isError ? 'border-red-400 text-red-600' : 'border-yellow-200'}`}
                  />
                );
              })}
            </motion.div>

            <Button
              type="submit"
              disabled={loading || isOrbiting || otp.length !== 6}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white h-12 text-base font-bold rounded-full border-0 shadow-lg disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Verify OTP
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">Didn&apos;t receive it?</p>
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0 || isOrbiting || loading}
              className="flex items-center gap-1.5 mx-auto text-sm text-[#f59e0b] hover:underline disabled:opacity-50 disabled:no-underline font-semibold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend OTP'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-[#f59e0b] hover:underline font-medium">← Back to login</Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#f59e0b]" />
          <p className="text-gray-500 font-medium">Loading...</p>
        </div>
      }>
        <VerifyOtpContent />
      </Suspense>
    </div>
  );
}
