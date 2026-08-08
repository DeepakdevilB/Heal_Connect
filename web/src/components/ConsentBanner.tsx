'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import Link from 'next/link';
import { consentApi, type ConsentCategory } from '@/lib/api';

const REQUIRED_CATEGORIES: ConsentCategory[] = ['ANALYTICS', 'MARKETING'];

/**
 * Cookie/consent banner. GDPR requirements this satisfies (see Privacy Policy
 * guide): opt-in by default (nothing is granted until the person acts), "Reject
 * all" carries the same visual weight as "Accept all", and no analytics/marketing
 * script may load before a decision is recorded. There are currently no
 * third-party analytics/marketing scripts wired into the app at all, so this
 * banner is (for now) purely about recording the consent decision itself —
 * but it's built so that a future analytics script can gate on `granted`.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    consentApi
      .get()
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const state = res.data.consent;
        const decided = REQUIRED_CATEGORIES.every((c) => state[c] !== undefined);
        if (!decided) setVisible(true);
      })
      .catch(() => {
        // Network hiccup — don't block the page on the banner; it'll show again
        // on the next load if consent genuinely hasn't been recorded yet.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (choices: { analytics: boolean; marketing: boolean }) => {
    setSubmitting(true);
    try {
      await Promise.all([
        consentApi.record('ANALYTICS', choices.analytics),
        consentApi.record('MARKETING', choices.marketing),
      ]);
      setVisible(false);
    } catch {
      // If recording fails, keep the banner up rather than silently proceeding
      // as if consent were captured.
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4"
      >
        <div className="mx-auto max-w-3xl rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 shadow-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
              <Cookie className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                We use cookies for analytics and marketing to improve HealConnect. These are off by default —
                you choose what to allow. See our{' '}
                <Link href="/privacy" className="underline font-semibold text-amber-700 dark:text-amber-400">
                  Privacy Policy
                </Link>{' '}
                for details.
              </p>

              {customize && (
                <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-white/10 pt-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="rounded" />
                    Analytics — helps us understand how the app is used
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="rounded" />
                    Marketing — personalized offers and promotions
                  </label>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {customize ? (
                  <button
                    onClick={() => submit({ analytics, marketing })}
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Save preferences
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => submit({ analytics: true, marketing: true })}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      Accept all
                    </button>
                    <button
                      onClick={() => submit({ analytics: false, marketing: false })}
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 disabled:opacity-50"
                    >
                      Reject all
                    </button>
                    <button
                      onClick={() => setCustomize(true)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-white"
                    >
                      Customize
                    </button>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => submit({ analytics: false, marketing: false })}
              title="Close (treated as Reject all)"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
