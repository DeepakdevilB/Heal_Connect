'use client';

import { useFCM } from '@/hooks/useFCM';

export function FCMProvider({ children }: { children: React.ReactNode }) {
  // Initialize FCM and listeners on mount
  useFCM();

  return <>{children}</>;
}
