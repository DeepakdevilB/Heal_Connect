import type { Metadata } from 'next';

// ─── Site-wide SEO config ────────────────────────────────────────────────────
// Base URL used for canonical links, sitemap.xml, robots.txt and Open Graph
// image URLs. Set NEXT_PUBLIC_SITE_URL once a custom domain is attached to the
// Azure Static Web App; until then this falls back to the default Azure URL.

export const SITE_NAME = 'HealConnect';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://blue-plant-0d21bc900.7.azurestaticapps.net'
).replace(/\/$/, '');

export const DEFAULT_TITLE = 'HealConnect - Professional Wellness';
export const DEFAULT_DESCRIPTION =
  'Connect with verified energy healers, Vastu experts, numerologists, and tarot readers instantly via chat, audio, or video.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/Logo.png`;

/** Resolve a site-relative path to an absolute URL under SITE_URL. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

interface PageMetadataInput {
  title: string;
  description: string;
  /** Site-relative path, e.g. "/blog" or "/practitioners/abc123" */
  path: string;
  image?: string;
  /** Set for content pages like blog posts where "article" is more accurate than "website" */
  type?: 'website' | 'article';
  noIndex?: boolean;
}

/**
 * Build a Metadata object for a public page with title, description,
 * canonical URL, and Open Graph / Twitter card tags all wired up consistently.
 */
export function buildMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image }],
      type,
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

/**
 * Absolute backend API base URL for use in server-side code (generateMetadata,
 * sitemap.ts, robots.ts) where relative fetch() calls don't work — there's no
 * browser origin to resolve them against. Mirrors the same fallback chain as
 * next.config.mjs's rewrites() so local dev and Azure builds stay consistent.
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL || 'http://localhost:8080';
}

/** Truncate long free-text content down to a clean meta description length. */
export function toMetaDescription(text: string | null | undefined, fallback: string, max = 160): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return fallback;
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}
