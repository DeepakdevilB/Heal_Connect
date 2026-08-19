import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import BlogClient from './BlogClient';

export const metadata: Metadata = buildMetadata({
  title: 'Astrology & Wellness Blog',
  description:
    'Explore articles on Vedic astrology, numerology, tarot, Vastu Shastra, zodiac signs, and holistic wellness from HealConnect experts.',
  path: '/blog',
});

export default function BlogPage() {
  return <BlogClient />;
}
