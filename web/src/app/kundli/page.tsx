import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import KundliClient from './KundliClient';

export const metadata: Metadata = buildMetadata({
  title: 'Free Kundli & Birth Chart Analysis',
  description:
    'Generate your free Vedic birth chart (Kundli), explore the 12 houses and planetary positions, and connect with an expert astrologer for a detailed reading.',
  path: '/kundli',
});

export default function KundliPage() {
  return <KundliClient />;
}
