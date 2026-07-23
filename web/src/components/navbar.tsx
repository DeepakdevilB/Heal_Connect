'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-3">
      <header
        className={`mx-auto max-w-6xl transition-all duration-500 flex items-center justify-between px-6 h-14 ${
          scrolled
            ? 'bg-[#0f0f0f] rounded-full shadow-2xl border border-white/10'
            : 'bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-yellow-100'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full shadow-sm" />
          <span className="text-lg font-extrabold text-[#f59e0b]">HealConnect</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex gap-6 items-center">
          <Link
            href="/practitioners"
            className={`text-sm font-extrabold transition-colors flex items-center gap-1.5 px-3 py-1 rounded-full ${
              scrolled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-amber-100/80 text-[#d97706] border border-amber-300/60 hover:bg-amber-200/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>Find Astrologers</span>
          </Link>
          {['#features', '#pricing', '#experts'].map((href, i) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors ${
                scrolled ? 'text-gray-400 hover:text-white' : 'text-gray-700 hover:text-[#f59e0b]'
              }`}
            >
              {['Features', 'Pricing', 'Our Experts'][i]}
            </Link>
          ))}
        </nav>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Link href="/practitioners" className="md:hidden">
            <Button size="sm" variant="outline" className="border-amber-300 text-[#d97706] bg-amber-50 text-xs px-2.5 rounded-full font-bold">
              Astrologers
            </Button>
          </Link>
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className={`font-medium transition-colors rounded-full ${
                scrolled ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-[#f59e0b] hover:bg-yellow-50'
              }`}
            >
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="bg-[#f59e0b] hover:bg-[#d97706] text-white border-0 rounded-full px-5 font-semibold">
              Sign Up Free
            </Button>
          </Link>
        </div>
      </header>
    </div>
  );
}
