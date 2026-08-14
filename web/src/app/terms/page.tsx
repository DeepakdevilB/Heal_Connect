import Link from 'next/link';

export const metadata = { title: 'Terms & Conditions — HealConnect' };

export default function TermsPage() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing or using HealConnect ("Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Platform. These terms apply to all users including clients and registered experts (astrologers, healers, coaches).`,
    },
    {
      title: '2. Eligibility',
      content: `You must be at least 18 years of age to use this Platform. By registering, you confirm that all information provided is accurate, complete, and up to date. HealConnect reserves the right to suspend or terminate accounts found to be in violation.`,
    },
    {
      title: '3. Expert Registration & Verification',
      content: `Experts applying to join HealConnect must submit valid identity documents (Aadhaar mandatory for Indian residents) and professional credentials. HealConnect reviews all applications manually. Approval is at the sole discretion of HealConnect. Providing false or misleading information will result in permanent account termination.`,
    },
    {
      title: '4. Services & Sessions',
      content: `HealConnect provides a platform for clients to connect with verified spiritual and wellness experts via chat and audio consultations. Sessions are billed per minute from the client's wallet. HealConnect does not guarantee specific outcomes from any consultation. Experts are independent service providers and not employees of HealConnect.`,
    },
    {
      title: '5. Payments & Wallet',
      content: `Clients must maintain sufficient wallet balance to initiate sessions. Wallet recharges are processed via Razorpay or Stripe. All payments are non-refundable except in cases of technical failure verified by HealConnect. Expert earnings are credited after session completion and are subject to platform commission.`,
    },
    {
      title: '6. Prohibited Conduct',
      content: `Users must not: share personal contact information (phone, email, social media) during sessions to bypass the platform; engage in harassment, abuse, or offensive behaviour; provide medical, legal, or financial advice that could cause harm; impersonate another person or expert; attempt to manipulate ratings or reviews.`,
    },
    {
      title: '7. Intellectual Property',
      content: `All content on HealConnect including logos, design, text, and software is the property of HealConnect or its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.`,
    },
    {
      title: '8. Limitation of Liability',
      content: `HealConnect is not liable for any direct, indirect, incidental, or consequential damages arising from your use of the Platform. Consultations are for guidance purposes only and do not constitute professional medical, legal, or financial advice.`,
    },
    {
      title: '9. Termination',
      content: `HealConnect reserves the right to suspend or permanently terminate any account at any time for violation of these terms, fraudulent activity, or any conduct deemed harmful to the Platform or its users.`,
    },
    {
      title: '10. Changes to Terms',
      content: `HealConnect may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms. We will notify users of significant changes via email or in-app notification.`,
    },
    {
      title: '11. Governing Law',
      content: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Mumbai, Maharashtra, India.`,
    },
    {
      title: '12. Contact',
      content: `For any questions regarding these Terms, contact us at support@healconnect.in`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fffbf0]">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-500 py-14 px-4 text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2">Terms & Conditions</h1>
        <p className="text-yellow-100 text-sm">Last updated: January 2026</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 space-y-8">

          <p className="text-gray-600 text-sm leading-relaxed border-l-4 border-amber-400 pl-4">
            Please read these Terms & Conditions carefully before using HealConnect. These terms govern your use of our platform as a client or expert.
          </p>

          {sections.map((s) => (
            <div key={s.title}>
              <h2 className="text-base font-bold text-gray-900 mb-2">{s.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{s.content}</p>
            </div>
          ))}

        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-500">
            Also read our{' '}
            <Link href="/privacy" className="text-amber-600 hover:text-amber-700 font-medium underline">Privacy Policy</Link>
          </p>
          <Link href="/astrologer/onboarding" className="inline-block text-sm text-gray-400 hover:text-gray-600">
            ← Back to Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
