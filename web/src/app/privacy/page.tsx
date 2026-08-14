import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — HealConnect' };

export default function PrivacyPage() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: `We collect the following types of information:
• Personal Information: Name, mobile number, email address, date of birth, gender, profile photo.
• Identity Documents: Aadhaar card, PAN card, passport, or other government-issued IDs submitted during expert verification.
• Professional Information: Specializations, qualifications, certifications, social media profiles.
• Usage Data: Session history, chat messages, call logs, wallet transactions, device information, and IP address.
• Payment Information: Processed securely via Razorpay or Stripe. We do not store card details.`,
    },
    {
      title: '2. How We Use Your Information',
      content: `We use your information to:
• Create and manage your account on HealConnect.
• Verify expert identity and professional credentials.
• Facilitate real-time chat and audio consultations.
• Process wallet recharges and expert payouts.
• Send OTP verification, session notifications, and platform updates via SMS and email.
• Improve platform features, detect fraud, and ensure safety.
• Comply with legal obligations under Indian law.`,
    },
    {
      title: '3. How We Share Your Information',
      content: `We do not sell your personal data. We may share information with:
• Verification Team: Identity documents are reviewed only by authorised HealConnect staff.
• Service Providers: Twilio (SMS), SendGrid (email), Razorpay/Stripe (payments), Azure (storage) — bound by confidentiality agreements.
• Legal Authorities: When required by law, court order, or to protect the rights and safety of users.
• Other Users: Your display name, profile photo, specializations, and ratings are visible to clients on the platform.`,
    },
    {
      title: '4. Data Storage & Security',
      content: `Your data is stored on secure servers hosted on Microsoft Azure (Central India region). We use industry-standard encryption (TLS/HTTPS) for data in transit and AES-256 for data at rest. Identity documents are stored in Azure Blob Storage with restricted access. We implement JWT-based authentication with token rotation and Redis-based blacklisting for session security.`,
    },
    {
      title: '5. Cookies & Local Storage',
      content: `HealConnect uses browser localStorage to store authentication tokens and session preferences. We do not use third-party tracking cookies. You can clear your browser storage at any time, which will log you out of the platform.`,
    },
    {
      title: '6. Your Rights',
      content: `You have the right to:
• Access the personal data we hold about you.
• Request correction of inaccurate information.
• Request deletion of your account and associated data.
• Withdraw consent for marketing communications at any time.
To exercise these rights, contact us at privacy@healconnect.in`,
    },
    {
      title: '7. Data Retention',
      content: `We retain your personal data for as long as your account is active or as required by law. Upon account deletion, personal data is removed within 30 days, except where retention is required for legal, tax, or fraud prevention purposes. Chat messages and session records may be retained for up to 12 months for dispute resolution.`,
    },
    {
      title: '8. Children\'s Privacy',
      content: `HealConnect is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has registered, we will immediately delete their account and associated data.`,
    },
    {
      title: '9. Third-Party Links',
      content: `Our platform may contain links to third-party websites (e.g. Instagram, YouTube, LinkedIn profiles of experts). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.`,
    },
    {
      title: '10. Changes to This Policy',
      content: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Continued use of the Platform after changes constitutes acceptance of the updated policy.`,
    },
    {
      title: '11. Contact Us',
      content: `For privacy-related queries, data requests, or concerns, contact our Data Protection Officer at:
Email: privacy@healconnect.in
Address: HealConnect, Mumbai, Maharashtra, India`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fffbf0]">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 py-14 px-4 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2">Privacy Policy</h1>
        <p className="text-yellow-100 text-sm">Last updated: January 2026</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 space-y-8">

          <p className="text-gray-600 text-sm leading-relaxed border-l-4 border-amber-400 pl-4">
            HealConnect ("we", "us", "our") is committed to protecting your privacy. This policy explains how we collect, use, store, and protect your personal information when you use our platform.
          </p>

          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-base font-bold text-gray-900 mb-2">{s.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.content}</p>
            </div>
          ))}

        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Also read our{' '}
            <Link href="/terms" className="text-amber-600 hover:text-amber-700 font-medium underline">Terms & Conditions</Link>
          </p>
          <Link href="/astrologer/onboarding" className="inline-block text-sm text-gray-400 hover:text-gray-600">
            ← Back to Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
