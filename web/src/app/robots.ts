import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Runs at build/request time on the server — generates /robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/admin/*',
        '/dashboard',
        '/dashboard/*',
        '/expert/dashboard',
        '/expert/profile',
        '/session',
        '/session/*',
        '/auth',
        '/auth/*',
        '/login',
        '/signup',
        '/expert/login',
        '/expert/signup',
        '/verify-email',
        '/verify-email/*',
        '/verify-otp',
        '/reset-password',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
