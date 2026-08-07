'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExpertSignupRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/signup?role=expert');
  }, [router]);
  return null;
}
