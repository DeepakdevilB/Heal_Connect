import type { MetadataRoute } from 'next';
import { SITE_URL, getApiBaseUrl } from '@/lib/seo';

// Revalidate the generated sitemap at most once per hour so new blog posts /
// practitioners show up without needing a full redeploy.
export const revalidate = 3600;

interface BlogSummary {
  id: string;
  updatedAt?: string;
}

interface PractitionerSummary {
  id: string;
}

async function getBlogs(): Promise<BlogSummary[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/blogs`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.blogs ?? [];
  } catch {
    return [];
  }
}

async function getPractitioners(): Promise<PractitionerSummary[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/practitioners?limit=50`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.practitioners ?? [];
  } catch {
    return [];
  }
}

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/practitioners', priority: 0.9, changeFrequency: 'daily' },
  { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
  { path: '/faq', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/reviews', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/horoscope', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/kundli', priority: 0.6, changeFrequency: 'weekly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [blogs, practitioners] = await Promise.all([getBlogs(), getPractitioners()]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = blogs.map((blog) => ({
    url: `${SITE_URL}/blog/${blog.id}`,
    lastModified: blog.updatedAt ? new Date(blog.updatedAt) : new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const practitionerEntries: MetadataRoute.Sitemap = practitioners.map((p) => ({
    url: `${SITE_URL}/practitioners/${p.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticEntries, ...practitionerEntries, ...blogEntries];
}
