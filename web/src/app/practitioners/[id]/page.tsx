import type { Metadata } from 'next';
import { buildMetadata, getApiBaseUrl, toMetaDescription, SITE_URL } from '@/lib/seo';
import PractitionerDetailClient from './PractitionerDetailClient';

interface Practitioner {
  id: string;
  name: string;
  bio: string | null;
  specialties: string[];
  languages: string[];
  photoUrl: string | null;
  isVerified: boolean;
  avgRating?: number;
  reviewCount?: number;
}

async function getPractitioner(id: string): Promise<Practitioner | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/practitioners/${id}`, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.practitioner ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPractitioner(id);

  if (!p) {
    return buildMetadata({
      title: 'Expert Not Found',
      description: 'This practitioner profile could not be found.',
      path: `/practitioners/${id}`,
      noIndex: true,
    });
  }

  const specialty = p.specialties?.[0];
  return buildMetadata({
    title: `${p.name}${specialty ? ` — ${specialty} Expert` : ''}`,
    description: toMetaDescription(p.bio, `Connect with ${p.name} on HealConnect for a live consultation.`),
    path: `/practitioners/${p.id}`,
    image: p.photoUrl || undefined,
  });
}

export default async function PractitionerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPractitioner(id);

  const jsonLd = p
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: p.name,
        description: p.bio || undefined,
        image: p.photoUrl || undefined,
        url: `${SITE_URL}/practitioners/${p.id}`,
        knowsLanguage: p.languages,
        ...(p.avgRating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: p.avgRating,
                reviewCount: p.reviewCount || 0,
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PractitionerDetailClient />
    </>
  );
}
