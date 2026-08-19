import type { Metadata } from 'next';
import { buildMetadata, getApiBaseUrl, toMetaDescription, SITE_URL } from '@/lib/seo';
import BlogPostClient from './BlogPostClient';

interface Blog {
  id: string;
  title: string;
  content: string;
  author: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

async function getBlog(id: string): Promise<Blog | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/blogs/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.blog ?? null;
  } catch {
    return null;
  }
}

function plainText(markdown: string): string {
  return markdown.replace(/[#*_>`~\-]/g, ' ');
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const blog = await getBlog(id);

  if (!blog) {
    return buildMetadata({
      title: 'Article Not Found',
      description: 'This blog article could not be found.',
      path: `/blog/${id}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: blog.title,
    description: toMetaDescription(plainText(blog.content), 'Read this article on HealConnect.'),
    path: `/blog/${blog.id}`,
    image: blog.imageUrl || undefined,
    type: 'article',
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blog = await getBlog(id);

  const jsonLd = blog
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: blog.title,
        image: blog.imageUrl ? [blog.imageUrl] : undefined,
        author: { '@type': 'Person', name: blog.author },
        datePublished: blog.createdAt,
        dateModified: blog.updatedAt,
        mainEntityOfPage: `${SITE_URL}/blog/${blog.id}`,
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
      <BlogPostClient />
    </>
  );
}
