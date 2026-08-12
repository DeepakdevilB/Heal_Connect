import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import PractitionersClient from './PractitionersClient';

export const metadata: Metadata = buildMetadata({
  title: 'Find Verified Astrologers, Healers & Wellness Experts',
  description:
    'Browse verified energy healers, Vastu experts, numerologists, and tarot readers. Filter by specialty, language, and rating, then connect instantly by chat, audio, or video.',
  path: '/practitioners',
});

export default function PractitionersPage() {
  return <PractitionersClient />;
}
