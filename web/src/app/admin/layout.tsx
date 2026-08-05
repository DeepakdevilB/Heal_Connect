import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HealConnect Admin Panel',
  description: 'Admin dashboard for HealConnect platform management',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
