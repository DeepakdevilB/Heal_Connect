import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import HoroscopeClient from './HoroscopeClient';

export const metadata: Metadata = buildMetadata({
  title: 'Daily, Weekly & Monthly Horoscope',
  description:
    'Get your zodiac horoscope for love, career, health, and finance — updated by HealConnect astrologers for all 12 signs.',
  path: '/horoscope',
});

export default function HoroscopePage() {
  return <HoroscopeClient />;
}
