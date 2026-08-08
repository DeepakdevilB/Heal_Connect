'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, UserCheck, CalendarClock, MessageSquare,
  BookOpen, Star, HelpCircle, Image, Bell, BarChart3, Settings,
  LogOut, Menu, X, ChevronRight, Shield, Sparkles, Wallet,
  FileText, Layers, Sun, Moon, Hash, Video, ShieldAlert, LifeBuoy
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',       href: '/admin/dashboard',      icon: LayoutDashboard },
  { label: 'Users',           href: '/admin/users',          icon: Users },
  { label: 'Sessions',        href: '/admin/sessions',       icon: CalendarClock },
  { label: 'Payouts',         href: '/admin/payouts',        icon: Wallet },
  { label: 'Reviews',         href: '/admin/reviews',        icon: Star },
  { label: 'Blogs',           href: '/admin/blogs',          icon: BookOpen },
  { label: 'FAQs',            href: '/admin/faqs',           icon: HelpCircle },
  { label: 'Banners',         href: '/admin/banners',        icon: Image },
  { label: 'Moderation',      href: '/admin/moderation',     icon: ShieldAlert },
  { label: 'Messages',        href: '/admin/messages',       icon: MessageSquare },
  { label: 'Tickets',         href: '/admin/tickets',        icon: LifeBuoy },
  { label: 'Analytics',       href: '/admin/analytics',      icon: BarChart3 },
  { label: 'Settings',        href: '/admin/settings',       icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && localStorage.getItem('hc_admin_auth') !== 'true') {
      router.replace('/admin/login');
    }
    const savedDark = localStorage.getItem('hc_admin_dark') === 'true';
    setDark(savedDark);
  }, [router]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('hc_admin_dark', String(next));
  };

  const handleLogout = () => {
    localStorage.removeItem('hc_admin_auth');
    router.replace('/admin/login');
  };

  const pageTitle = NAV_ITEMS.find(n => pathname.startsWith(n.href))?.label ?? 'Admin Panel';

  if (!mounted) return null;

  const SidebarContent = () => (
    <div className={`flex flex-col h-full ${dark ? 'bg-slate-900' : 'bg-white'} border-r ${dark ? 'border-white/10' : 'border-gray-100'}`}>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b ${dark ? 'border-white/10' : 'border-gray-100'}`}>
        <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200/50 shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <p className={`text-sm font-black leading-tight ${dark ? 'text-white' : 'text-gray-900'}`}>HealConnect</p>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Admin Panel</p>
          </motion.div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                active
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200/40'
                  : dark
                  ? 'text-white/60 hover:bg-white/5 hover:text-white'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <Icon className={`shrink-0 transition-all ${sidebarOpen ? 'w-4 h-4' : 'w-5 h-5'} ${active ? 'text-white' : dark ? 'text-white/50 group-hover:text-white' : 'text-gray-400 group-hover:text-amber-600'}`} />
              {sidebarOpen && <span className="truncate">{label}</span>}
              {active && sidebarOpen && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`px-2 py-4 border-t ${dark ? 'border-white/10' : 'border-gray-100'}`}>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            dark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex ${dark ? 'bg-slate-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 220 : 64 }}
        transition={{ duration: 0.2 }}
        className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-0 h-full w-60 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className={`sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 h-14 border-b ${dark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100'} shadow-sm`}>
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            {/* Desktop sidebar toggle */}
            <button onClick={() => setSidebarOpen(p => !p)} className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-base font-extrabold ${dark ? 'text-white' : 'text-gray-900'}`}>{pageTitle}</h1>
              <p className={`text-[10px] font-medium ${dark ? 'text-white/40' : 'text-gray-400'}`}>HealConnect Admin Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark} className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-white/10 text-yellow-300' : 'hover:bg-gray-100 text-gray-500'}`}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${dark ? 'border-white/10 bg-white/5 text-white' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              Admin
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// ── Reusable Admin Components ──

export function StatCard({ label, value, icon: Icon, color = 'amber', change }: {
  label: string; value: string | number; icon: any; color?: string; change?: string;
}) {
  const colors: Record<string, string> = {
    amber: 'from-amber-400 to-orange-500',
    blue: 'from-blue-400 to-cyan-500',
    green: 'from-green-400 to-emerald-500',
    purple: 'from-purple-400 to-pink-500',
    red: 'from-red-400 to-rose-500',
    indigo: 'from-indigo-400 to-violet-500',
    teal: 'from-teal-400 to-cyan-500',
    rose: 'from-rose-400 to-pink-500',
  };
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-amber-200 dark:hover:border-amber-500/30 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color] ?? colors.amber} flex items-center justify-center shadow-md shadow-amber-500/10`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change && (
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200/50 dark:border-emerald-500/20">
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs font-bold text-gray-500 dark:text-white/60 mt-0.5">{label}</p>
    </motion.div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-blue-50 text-blue-700 border-blue-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    blocked: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
    disputed: 'bg-orange-50 text-orange-700 border-orange-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    flagged: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    published: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    hidden: 'bg-slate-50 text-slate-600 border-slate-200',
    verified: 'bg-blue-50 text-blue-700 border-blue-200',
    unverified: 'bg-gray-50 text-gray-600 border-gray-200',
    featured: 'bg-purple-50 text-purple-700 border-purple-200',
    processing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border ${map[status.toLowerCase()] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative flex-1 max-w-xs">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/></svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 transition-all"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-white/10"
          >
            <h3 className="text-base font-extrabold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-white/60 mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-3">
              <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-extrabold text-sm transition-all ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}>
                Confirm
              </button>
              <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white transition-all">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16 }}
      className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-2xl text-white font-extrabold text-sm shadow-xl ${colors[type]}`}
    >
      {type === 'success' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </motion.div>
  );
}

export function Pagination({ page, total, perPage, onChange }: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/10">
      <p className="text-xs text-gray-500 dark:text-white/50">Showing {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}</p>
      <div className="flex gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">Prev</button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onChange(p)} className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all ${p === page ? 'bg-amber-500 text-white shadow-md' : 'border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-white/60'}`}>{p}</button>
        ))}
        <button disabled={page === pages} onClick={() => onChange(page + 1)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">Next</button>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-white/10 rounded animate-pulse" /></td>
      ))}
    </tr>
  );
}
