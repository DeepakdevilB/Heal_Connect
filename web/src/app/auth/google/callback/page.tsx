'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authApi, tokenStore } from '@/lib/api';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');

    if (!idToken) {
      setError('No token received from Google. Please try again.');
      return;
    }

    authApi.googleSignIn(idToken).then((res) => {
      if (!res.success || !res.data) {
        setError(res.message || 'Google sign-in failed');
        return;
      }
      tokenStore.setTokens(res.data.accessToken, res.data.refreshToken);
      router.replace('/dashboard');
    }).catch((err) => {
      setError(`Google sign-in failed. Please try again. [${err.message || String(err)}]`);
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {error ? (
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error}</p>
          <a href="/login" className="text-indigo-400 hover:underline">Back to login</a>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p>Completing sign-in...</p>
        </div>
      )}
    </div>
  );
}
