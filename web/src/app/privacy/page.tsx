import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import Navbar from '@/components/navbar';
import { ShieldCheck } from 'lucide-react';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description:
    'How HealConnect collects, uses, shares, and protects your personal data, and how to exercise your data protection rights.',
  path: '/privacy',
});

const LAST_UPDATED = 'August 8, 2026';

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

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1a1a1a] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-32 pb-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-14">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Privacy Policy</h1>
            <p className="text-gray-500">Last updated: {LAST_UPDATED}</p>
          </div>

          <p className="text-gray-700 leading-relaxed mb-10 text-[15px]">
            This policy explains how HealConnect ("we", "us") collects, uses, and protects your personal data when
            you use our website and app to connect with astrologers and wellness practitioners. It applies to
            registered users and practitioners (experts) alike. It is written to be read alongside applicable data
            protection law, including the EU/UK GDPR and India's Digital Personal Data Protection Act.
          </p>

          <Section n={1} title="Who we are">
            <p>
              HealConnect operates this platform. For any privacy question, correction request, or complaint,
              contact us at <span className="font-semibold">privacy@healconnect.app</span>.
            </p>
          </Section>

          <Section n={2} title="What we collect">
            <p>
              Account details: name, email, phone number, gender, date of birth, and birth place (used for
              astrological readings). Consultation content: chat messages and call transcripts exchanged during a
              session with a practitioner. Payment references: wallet transaction records — we never store your
              card or UPI details directly; our payment processor handles those. Usage data: device/browser
              information and basic activity logs needed to operate and secure the service.
            </p>
          </Section>

          <Section n={3} title="Why we process your data (lawful basis)">
            <p>
              Creating your account and delivering a consultation (contract). Fraud prevention, account security,
              and abuse moderation (legitimate interest). Analytics and marketing communications (consent — see
              "Cookies" below; off by default, and you can withdraw it at any time).
            </p>
          </Section>

          <Section n={4} title="Chat and call content — a note on sensitive topics">
            <p>
              During a consultation you may voluntarily share sensitive details with a practitioner (for example,
              about your health, relationships, or beliefs) as part of getting a reading. We treat this content as
              high-risk: it's encrypted in transit, access is restricted to the two participants and to our
              moderation team when a message is flagged for review, and it is automatically purged after{' '}
              <span className="font-semibold">90 days</span> — the message thread stays for your records, but the
              text itself is permanently removed. If a message is under active moderation review, it's held past
              90 days only until that review closes, then purged the same way.
            </p>
          </Section>

          <Section n={5} title="Who we share data with">
            <p>
              Practitioners you consult with (only what's needed to deliver the session). Our hosting/database
              provider, payment processor, SMS/email provider (for OTPs and notifications), and — only once you've
              opted in — analytics or marketing tools. We do not sell your data.
            </p>
          </Section>

          <Section n={6} title="International transfers">
            <p>
              If any service provider we use processes data outside your country, we rely on their standard
              contractual safeguards (such as Standard Contractual Clauses) to protect it.
            </p>
          </Section>

          <Section n={7} title="How long we keep data">
            <p>
              Account and profile data: kept while your account is active. Chat/call content: purged after 90 days
              (see above). Session and payment records: retained for as long as required for accounting and legal
              obligations, even after you delete your account, since we anonymize rather than remove the
              underlying financial record. Consent decisions: kept as an audit trail of what you agreed to and
              when.
            </p>
          </Section>

          <Section n={8} title="Your rights">
            <p>
              You can access and download a copy of your data, correct inaccurate details, delete (erase) your
              account, and withdraw consent for analytics/marketing at any time. To download your data or delete
              your account, use the options in your account settings. To exercise any other right, email{' '}
              <span className="font-semibold">privacy@healconnect.app</span>.
            </p>
          </Section>

          <Section n={9} title="Cookies and tracking">
            <p>
              We use a consent banner to ask before enabling analytics or marketing cookies — both are off until
              you choose "Accept". Necessary cookies (for login sessions) don't require consent since the service
              can't function without them. You can change your choice at any time from the banner or by clearing
              your browser's local storage for this site.
            </p>
          </Section>

          <Section n={10} title="Complaints">
            <p>
              If you're unhappy with how we've handled your data, you can contact us first at{' '}
              <span className="font-semibold">privacy@healconnect.app</span>, or lodge a complaint with your local
              data protection authority.
            </p>
          </Section>

          <p className="text-xs text-gray-400 mt-14 border-t border-gray-200 pt-6">
            This policy is provided as a good-faith summary of our data practices and is not legal advice. Contact
            details above are placeholders — please confirm the right contact address before publishing.
          </p>
        </div>
      </main>
    </div>
  );
}
