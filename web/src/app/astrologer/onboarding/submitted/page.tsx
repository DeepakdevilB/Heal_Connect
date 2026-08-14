'use client';

import { astrologerTokenStore } from '@/lib/api';
import { CheckCircle } from 'lucide-react';

export default function AstrologerSubmittedPage() {
  const profile = astrologerTokenStore.getProfile();
  const name = profile?.displayName || 'Astrologer';

  return (
    <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full space-y-4">

        {/* Success card */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Application Submitted!</h1>
          <p className="text-amber-600 font-medium text-sm mb-3">Welcome, {name}</p>
          <p className="text-gray-500 text-sm leading-relaxed">
            Your application is now under review. Our team carefully verifies every expert to maintain platform quality.
          </p>
        </div>

        {/* Status tracker */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">Application Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Application Received',   desc: 'Your details have been saved',              done: true,  active: false },
              { label: 'Document Verification',  desc: 'ID & professional credentials check',       done: false, active: true  },
              { label: 'Admin Review',            desc: 'Final approval by our team',                done: false, active: false },
              { label: 'Account Activated',       desc: 'Start taking consultations',                done: false, active: false },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
                  item.done   ? 'bg-green-500 text-white' :
                  item.active ? 'bg-amber-500 text-white ring-4 ring-amber-100' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {item.done ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${item.done || item.active ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</p>
                  <p className={`text-xs ${item.done || item.active ? 'text-gray-500' : 'text-gray-300'}`}>{item.desc}</p>
                </div>
                {item.active && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">In Progress</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* What next */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">What Happens Next?</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">📱</span> You'll receive an SMS once your application is reviewed</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">⏱️</span> Review typically takes <strong>2–3 business days</strong></li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✅</span> On approval, your account goes live and you can start earning</li>
            <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">❓</span> If more info is needed, our team will contact you directly</li>
          </ul>
        </div>

        <button
          onClick={() => { astrologerTokenStore.clear(); window.location.href = '/astrologer/login'; }}
          className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Sign out and come back later →
        </button>

      </div>
    </div>
  );
}
