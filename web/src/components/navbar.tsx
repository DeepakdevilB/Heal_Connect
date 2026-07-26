'use client';

import { useEffect, useState, useRef, type ElementType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useLang } from '@/lib/lang-context';
import {
  Sparkles,
  Star,
  Wand2,
  Calculator,
  CalendarDays,
  ShoppingBag,
  BookOpen,
  RefreshCw,
  Sun,
  Moon,
  Zap,
  Gem,
  Users,
} from 'lucide-react';

type MenuItem = { label: string; href: string; Icon: ElementType };

const MENU_SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Consult',
    items: [
      { label: 'Consultations', href: '/login', Icon: Sparkles },
      { label: 'Horoscope', href: '/signup', Icon: Star },
    ],
  },
  {
    title: 'Free Tools',
    items: [
      { label: 'Free Services', href: '/signup', Icon: Wand2 },
      { label: 'Calculators', href: '/signup', Icon: Calculator },
      { label: 'Panchang', href: '/signup', Icon: CalendarDays },
    ],
  },
  {
    title: 'More',
    items: [
      { label: 'Shop', href: '/signup', Icon: ShoppingBag },
      { label: 'Blog', href: '/signup', Icon: BookOpen },
    ],
  },
];

const NAV_SECTIONS = [
  { id: 'features', label: 'Features' },
  { id: 'experts', label: 'Our Experts' },
  { id: 'pricing', label: 'Pricing' },
] as const;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useLang();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver for active section tracking
  useEffect(() => {
    const elMap = new Map<string, HTMLElement>();
    for (const { id } of NAV_SECTIONS) {
      const el = document.getElementById(id);
      if (el) elMap.set(id, el);
    }
    if (elMap.size === 0) return;

    const visibleMap = new Map<string, boolean>();
    for (const id of elMap.keys()) visibleMap.set(id, false);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target.id) visibleMap.set(entry.target.id, entry.isIntersecting);
        }
        // Find the bottom-most visible section
        let bottomMost = '';
        let maxBottom = -Infinity;
        for (const [id, visible] of visibleMap) {
          if (visible) {
            const rect = elMap.get(id)!.getBoundingClientRect();
            const bottom = rect.bottom;
            if (bottom > maxBottom) {
              maxBottom = bottom;
              bottomMost = id;
            }
          }
        }
        setActiveSection(bottomMost);
      },
      { threshold: 0.2 }
    );

    for (const el of elMap.values()) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isDark = scrolled;

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Left Slide Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-72 z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-amber-400 to-orange-400 px-5 pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full border-2 border-white/40" />
              <span className="text-lg font-extrabold text-white">HealConnect</span>
            </div>
            <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Online count */}
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
            </span>
            <span className="text-white/90 text-xs font-semibold">1,240 astrologers online now</span>
          </div>

          {/* Avatar row */}
          <div className="flex items-center gap-1 mb-4">
            <div className="flex -space-x-2">
              {['/avatars/astrologer_1.jpg', '/avatars/astrologer_4.jpg', '/avatars/astrologer_6.jpg'].map((src, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white/60 overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border-2 border-white/60 bg-white/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">+3</span>
              </div>
            </div>
            <span className="text-white/70 text-[11px] ml-1">Astrologer</span>
          </div>

          {/* Sign in CTA */}
          <Link
            href="/login"
            onClick={() => setDrawerOpen(false)}
            className="block bg-white rounded-xl px-4 py-3.5 shadow-md hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Sign In / Sign Up</p>
                <p className="text-[11px] text-gray-700">
                  Your 1st Chat is <strong className="text-amber-600">100% Free</strong>
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Menu body */}
        <div className="flex-1 overflow-y-auto py-3">
          {MENU_SECTIONS.map((section, si) => (
            <div key={si} className={si > 0 ? 'mt-1' : ''}>
              <p className="px-5 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {section.title}
              </p>
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-all group"
                >
                  <span className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-amber-100 flex items-center justify-center text-base transition-colors">
                    <item.Icon className="w-4 h-4 text-gray-500 group-hover:text-amber-600" />
                  </span>
                  {item.label}
                  <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-400 ml-auto transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
              {si < MENU_SECTIONS.length - 1 && <div className="mx-5 mt-2 border-t border-gray-100" />}
            </div>
          ))}

          {/* Theme */}
          <div className="mx-4 mt-4 border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Theme</p>
            <div className="flex gap-2">
              {([{ Icon: RefreshCw, val: 'system' }, { Icon: Sun, val: 'light' }, { Icon: Moon, val: 'dark' }]).map(({ Icon, val }) => (
                <button
                  key={val}
                  onClick={() => setTheme(val)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1 ${
                    theme === val ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {val === 'system' ? 'Auto' : val === 'light' ? 'Day' : 'Night'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Navbar */}
      <div className="fixed top-0 left-0 right-0 z-30 px-4 pt-3">
        <header className={`mx-auto max-w-6xl transition-all duration-500 flex items-center justify-between px-4 h-14 ${
          isDark ? 'bg-[#0f0f0f] rounded-full shadow-2xl border border-white/10' : 'bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-yellow-100'
        }`}>
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="HealConnect" width={30} height={30} className="rounded-full shadow-sm" />
              <span className={`text-lg font-extrabold transition-colors ${isDark ? 'text-white' : 'text-black'}`}>HealConnect</span>
            </Link>
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full border border-gray-200 px-1.5 py-1 shadow-sm">
            <Link
              href="/practitioners"
              className="text-sm font-extrabold transition-colors px-4 py-1.5 rounded-full flex items-center gap-1.5 bg-amber-100/80 text-[#d97706] border border-amber-300/60"
            >
              <Star className="w-3.5 h-3.5" />
              Find Astrologers
            </Link>
            {NAV_SECTIONS.map(({ id, label }) => (
              <Link
                key={id}
                href={`#${id}`}
                className={`relative text-sm font-medium transition-all px-4 py-1.5 rounded-full flex items-center gap-1.5 ${
                  activeSection === id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-gray-800 hover:text-amber-700'
                }`}
              >
                {id === 'features' && <Zap className="w-3.5 h-3.5" />}
                {id === 'pricing' && <Gem className="w-3.5 h-3.5" />}
                {id === 'experts' && <Users className="w-3.5 h-3.5" />}
                {label}
              </Link>
            ))}
          </nav>

          {/* Right: lang dropdown + profile */}
          <div className="flex items-center gap-2">
            {/* Language dropdown */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen((p) => !p)}
                className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-full border text-[13px] font-black transition-all ${
                  isDark ? 'border-white/20 hover:bg-white/10' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                <span className="text-amber-500">अ</span>
                <span className={isDark ? 'text-gray-400' : 'text-gray-400'}>/</span>
                <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>A</span>
                <svg className={`w-3 h-3 ml-0.5 transition-transform ${langOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {langOpen && (
                <div className={`absolute right-0 mt-2 w-36 rounded-xl shadow-xl border overflow-hidden z-50 ${isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-100'}`}>
                  {([{ code: 'en', label: 'English', sub: 'A' }, { code: 'hi', label: 'हिंदी', sub: 'अ' }] as const).map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                        lang === l.code
                          ? 'bg-amber-50 text-[#d97706] font-semibold'
                          : isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-bold text-amber-500">{l.sub}</span>
                      {l.label}
                      {lang === l.code && (
                        <svg className="w-3.5 h-3.5 ml-auto text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile icon */}
            <Link href="/login">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                <svg className={`w-6 h-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <circle cx="12" cy="8" r="4" />
                  <path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
            </Link>
          </div>
        </header>
      </div>
    </>
  );
}
