import type { Metadata } from 'next';
import { buildMetadata, getApiBaseUrl } from '@/lib/seo';
import FaqClient from './FaqClient';

export const metadata: Metadata = buildMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Answers to common questions about HealConnect — bookings, payments, wallet recharge, and sessions with astrologers, healers, and wellness experts.',
  path: '/faq',
});

interface Faq {
  id: string;
  question: string;
  answer: string;
}

async function getFaqs(): Promise<Faq[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/faqs`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.faqs ?? [];
  } catch {
    return [];
  }
}

export default async function FaqPage() {
  const faqs = await getFaqs();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  return (
    <>
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <FaqClient />
    </>
  );
}
