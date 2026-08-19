'use client';

import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AstrologerSubmittedPage() {
  return (
    <div className="min-h-screen bg-[#fffbf0] flex flex-col md:flex-row font-sans">

      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-between w-5/12 p-12 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-900/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16">
            <Image src="/logo.png" alt="HealConnect" width={36} height={36} className="rounded-full" />
            <span className="text-2xl font-extrabold text-white">HealConnect</span>
          </Link>
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">Thank you<br />for applying.</h1>
          <p className="text-amber-100/80 text-sm leading-relaxed mt-4 max-w-xs">
            We carefully review every application to maintain the quality of our practitioner community.
          </p>
        </div>
        <div className="relative z-10 border-t border-white/20 pt-6">
          <p className="text-amber-100/60 text-xs">© 2026 HealConnect. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Image src="/logo.png" alt="HealConnect" width={32} height={32} className="rounded-full" />
          <span className="text-xl font-extrabold text-amber-500">HealConnect</span>
        </div>

        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
            Thank you for your interest in HealConnect.
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            We'll review your application and be in touch if we'd like to invite you to the next stage.
          </p>
          <button
            onClick={() => window.location.href = '/astrologer/login'}
            className="mt-8 text-sm text-amber-600 hover:text-amber-700 font-semibold hover:underline transition-colors"
          >
            Sign in to check your status →
          </button>
        </div>
      </div>
    </div>
  );
}
