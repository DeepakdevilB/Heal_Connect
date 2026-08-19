import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import Navbar from '@/components/navbar';
import { FileText } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'The terms that govern your use of HealConnect, for both customers and practitioners.',
  path: '/terms',
});

const LAST_UPDATED = 'August 17, 2026';

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-extrabold text-gray-900 mb-3 flex items-baseline gap-2">
        <span className="text-amber-500">{n}.</span> {title}
      </h2>
      <div className="text-gray-700 leading-relaxed space-y-3 text-[15px]">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Terms of Service</h1>
            <p className="text-gray-500">Last updated: {LAST_UPDATED}</p>
          </div>

          <p className="text-gray-700 leading-relaxed mb-10 text-[15px]">
            These terms govern your use of HealConnect ("we", "us") — a marketplace connecting customers with
            independent astrologers and wellness practitioners for chat, audio, and video consultations. By creating
            an account you agree to these terms; if you don't agree, please don't use the service. See also our{' '}
            <span className="font-semibold">Privacy Policy</span> for how we handle your data.
          </p>

          <Section n={1} title="Eligibility">
            <p>
              You must be at least 18 years old to create an account or book a consultation. By registering, you
              confirm that you meet this requirement.
            </p>
          </Section>

          <Section n={2} title="Your account">
            <p>
              You're responsible for keeping your login credentials secure and for all activity under your account.
              Tell us immediately if you suspect unauthorized access. You agree to provide accurate information when
              registering and to keep it up to date.
            </p>
          </Section>

          <Section n={3} title="Not medical, legal, or financial advice">
            <p>
              Consultations offered through HealConnect — astrology, numerology, and related wellness guidance — are
              for informational and entertainment purposes. They are not a substitute for professional medical,
              mental-health, legal, or financial advice. If you're experiencing a medical or mental-health emergency,
              contact emergency services or a qualified professional directly, not a practitioner on this platform.
            </p>
          </Section>

          <Section n={4} title="Practitioners are independent">
            <p>
              Practitioners on HealConnect are independent professionals, not our employees. We verify certain
              profile information but don't guarantee the accuracy of any specific reading, prediction, or advice a
              practitioner gives. Your consultation is between you and the practitioner; we provide the platform that
              connects you.
            </p>
          </Section>

          <Section n={5} title="Payments and wallet">
            <p>
              Consultations are paid for using your in-app wallet balance, charged per minute (or per session, where
              stated) at the practitioner's listed rate. Wallet top-ups are processed by our payment provider — we
              don't store your card or UPI details directly. Refunds for failed or disrupted sessions are handled
              case-by-case through support; contact us if a session didn't go as expected.
            </p>
          </Section>

          <Section n={6} title="Acceptable use">
            <p>
              Don't use HealConnect to harass, threaten, or abuse another user or practitioner; to share content that
              is illegal, sexually exploitative of minors, or infringes someone else's rights; to attempt to access
              another account; or to circumvent the platform (for example, arranging to pay a practitioner directly
              to avoid platform fees). Chats and call transcripts may be reviewed if flagged for a safety or abuse
              report.
            </p>
          </Section>

          <Section n={7} title="Content and intellectual property">
            <p>
              HealConnect's branding, design, and software are our property or licensed to us. You keep ownership of
              what you write in chat, but you grant us a limited license to store and process it as needed to
              deliver the service (for example, showing you your own session history) and as described in the
              Privacy Policy.
            </p>
          </Section>

          <Section n={8} title="Suspension and termination">
            <p>
              We may suspend or terminate an account that violates these terms, including for abusive behavior,
              fraud, or attempts to circumvent the platform. You can delete your own account at any time from your
              account settings; see the Privacy Policy for what happens to your data afterward.
            </p>
          </Section>

          <Section n={9} title="Disclaimers and limitation of liability">
            <p>
              The service is provided "as is." To the fullest extent permitted by law, we aren't liable for indirect,
              incidental, or consequential damages arising from your use of the platform or from a practitioner's
              advice. Nothing in these terms limits liability that can't legally be limited.
            </p>
          </Section>

          <Section n={10} title="Changes to these terms">
            <p>
              We may update these terms from time to time. If we make a material change, we'll take reasonable steps
              to notify you (for example, in-app) before it takes effect. Continuing to use HealConnect after a
              change takes effect means you accept the updated terms.
            </p>
          </Section>

          <Section n={11} title="Governing law">
            <p>
              [Placeholder — the governing jurisdiction and dispute-resolution process should be confirmed with legal
              counsel based on where HealConnect is incorporated and where its users are located, before this page
              is relied on in production.]
            </p>
          </Section>

          <Section n={12} title="Contact">
            <p>
              Questions about these terms? Email <span className="font-semibold">support@healconnect.app</span>.
            </p>
          </Section>

          <p className="text-xs text-gray-400 mt-14 border-t border-gray-200 pt-6">
            This page is provided as a good-faith starting point and is not legal advice. It has not been reviewed by
            a lawyer — please have counsel review it (including the governing-law section above) before relying on
            it in production, consistent with the rest of the GDPR/legal workstream.
          </p>
        </div>
      </main>
    </div>
  );
}
