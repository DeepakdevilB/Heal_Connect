import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import ReviewsClient from './ReviewsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Client Reviews & Testimonials',
  description:
    'Read real reviews from HealConnect clients about their sessions with our astrologers, energy healers, and wellness experts.',
  path: '/reviews',
});

export default function ReviewsPage() {
  return <ReviewsClient />;
}
