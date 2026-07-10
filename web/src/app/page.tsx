import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Phone, ShieldCheck, Wallet, Star, Sparkles, CheckCircle } from 'lucide-react';
import Navbar from '@/components/navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fffbf0] text-[#1a1a1a] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1">

        {/* Hero */}
        <section className="relative overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24 bg-gradient-to-br from-[#fffbf0] via-[#fef3c7] to-[#fffbf0]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

              {/* Left — text */}
              <div className="flex-1 text-left">
                <Badge className="mb-6 bg-yellow-100 text-[#d97706] border border-yellow-300 px-4 py-1.5 rounded-full text-sm font-semibold">
                  ✨ Your 1st Chat is 100% Free
                </Badge>
                <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 text-[#1a1a1a] leading-tight">
                  Professional Wellness,{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f59e0b] to-[#ef4444]">
                    Anytime, Anywhere.
                  </span>
                </h1>
                <p className="text-lg text-gray-600 mb-10 max-w-xl leading-relaxed">
                  Connect with verified energy healers, Vastu experts, numerologists, and tarot readers instantly via chat or audio call.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="bg-[#f59e0b] hover:bg-[#d97706] text-white px-8 h-14 text-lg rounded-full shadow-lg border-0 font-bold">
                      Claim Free Session Now
                    </Button>
                  </Link>
                  <Link href="/practitioners">
                    <Button size="lg" variant="outline" className="border-2 border-[#f59e0b] text-[#d97706] hover:bg-yellow-50 h-14 text-lg rounded-full font-semibold">
                      Browse Experts
                    </Button>
                  </Link>
                </div>

                {/* Stats */}
                <div className="mt-12 pt-8 border-t border-yellow-200 flex flex-wrap gap-8">
                  {[
                    { value: '50K+', label: 'Happy Users' },
                    { value: '500+', label: 'Verified Experts' },
                    { value: '4.9/5', label: 'Average Rating', stars: true },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col gap-1">
                      {s.stars ? (
                        <div className="flex gap-0.5 text-yellow-400">
                          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                        </div>
                      ) : (
                        <p className="text-3xl font-extrabold text-[#f59e0b]">{s.value}</p>
                      )}
                      <p className="text-sm text-gray-500 font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white border-y border-yellow-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-[#1a1a1a]">Everything you need to heal</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">Our platform is designed to give you seamless access to spiritual and wellness guidance with just a tap.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: MessageCircle, color: 'text-[#f59e0b]', bg: 'bg-yellow-50', border: 'hover:border-yellow-400', title: 'Live Chat', desc: 'Instant text consultations. Private, secure, and available 24/7. Perfect for quick questions or deep readings.' },
                { icon: Phone, color: 'text-orange-500', bg: 'bg-orange-50', border: 'hover:border-orange-400', title: 'Audio Calls', desc: 'Connect voice-to-voice for a more personal healing experience. Crystal clear audio powered by global networks.' },
                { icon: ShieldCheck, color: 'text-green-600', bg: 'bg-green-50', border: 'hover:border-green-400', title: 'Verified Experts', desc: 'Every practitioner undergoes a rigorous 5-step background and skill verification process to ensure quality.' },
                { icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-50', border: 'hover:border-blue-400', title: 'Smart Wallet', desc: 'Pay only for what you use. Top up your secure wallet and be billed per minute with no hidden fees.' },
              ].map((f) => (
                <Card key={f.title} className={`bg-white border border-gray-100 ${f.border} transition-all shadow-sm hover:shadow-md`}>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                      <f.icon className={`w-6 h-6 ${f.color}`} />
                    </div>
                    <CardTitle className="text-lg text-[#1a1a1a]">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-500 text-sm leading-relaxed">{f.desc}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Experts */}
        <section id="experts" className="py-24 bg-[#fffbf0]">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-[#1a1a1a]">Meet our top practitioners</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">Connect with highly vetted spiritual guides and healers across the globe.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { initials: 'RS', name: 'Rahul Sharma', role: 'Vedic Astrologer', rating: 4.9, desc: 'Expert in career and marriage guidance with over 15 years of experience.', from: 'from-yellow-400', to: 'to-orange-500' },
                { initials: 'AM', name: 'Anjali Menon', role: 'Tarot Reader & Reiki', rating: 5.0, desc: 'Specializes in energy healing and relationship clarity using Rider Waite tarot.', from: 'from-pink-400', to: 'to-rose-500' },
                { initials: 'VK', name: 'Vikram Kapoor', role: 'Vastu Consultant', rating: 4.8, desc: 'Transforming homes and businesses to align with positive cosmic energies.', from: 'from-blue-400', to: 'to-indigo-500' },
              ].map((e) => (
                <Card key={e.name} className="bg-white border border-yellow-100 hover:border-yellow-300 hover:shadow-lg transition-all text-center pt-8">
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${e.from} ${e.to} mx-auto flex items-center justify-center text-2xl font-extrabold text-white shadow-md mb-4`}>
                    {e.initials}
                  </div>
                  <CardHeader className="pb-2 pt-0">
                    <CardTitle className="text-lg text-[#1a1a1a]">{e.name}</CardTitle>
                    <CardDescription className="text-[#f59e0b] font-semibold">{e.role}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-center gap-1 text-yellow-400 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                      <span className="text-gray-500 text-sm ml-1">({e.rating})</span>
                    </div>
                    <p className="text-gray-500 text-sm mb-5 line-clamp-2">{e.desc}</p>
                    <Button variant="outline" className="w-full border-yellow-300 text-[#d97706] hover:bg-yellow-50 rounded-full font-semibold">View Profile</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/practitioners">
                <Button variant="link" className="text-[#f59e0b] hover:text-[#d97706] text-base font-semibold">See all 500+ Experts →</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-white border-t border-yellow-100">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-[#1a1a1a]">Transparent Pricing</h2>
            <p className="text-gray-500 max-w-2xl mx-auto mb-16">Recharge your wallet and pay per minute. No subscriptions. No commitments.</p>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { title: 'Starter Healers', price: '₹10', desc: 'Verified professionals building their profiles.', popular: false, perks: ['Verified profile', 'Chat & Call', 'Wallet billing'] },
                { title: 'Experienced Healers', price: '₹25', desc: 'Top-rated experts with 5+ years of experience.', popular: true, perks: ['5+ years exp', 'Priority support', 'HD Audio calls'] },
                { title: 'Master Healers', price: '₹50+', desc: 'Renowned industry veterans and celebrity healers.', popular: false, perks: ['Celebrity experts', 'Exclusive sessions', 'VIP support'] },
              ].map((p) => (
                <div key={p.title} className={`p-8 rounded-2xl flex flex-col items-center relative transition-all ${p.popular ? 'bg-gradient-to-b from-[#fef3c7] to-white border-2 border-[#f59e0b] shadow-xl md:-translate-y-4' : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'}`}>
                  {p.popular && <div className="absolute -top-4 bg-[#f59e0b] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">Most Popular</div>}
                  <h3 className={`text-lg font-bold mb-1 ${p.popular ? 'text-[#d97706]' : 'text-[#1a1a1a]'}`}>{p.title}</h3>
                  <div className="flex items-baseline gap-1 my-4">
                    <span className="text-4xl font-extrabold text-[#1a1a1a]">{p.price}</span>
                    <span className="text-gray-400 text-sm">/ min</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">{p.desc}</p>
                  <ul className="w-full space-y-2 mb-8">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-[#f59e0b] shrink-0" /> {perk}
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full rounded-full font-semibold border-0 ${p.popular ? 'bg-[#f59e0b] hover:bg-[#d97706] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
                    View Experts
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-r from-[#f59e0b] to-[#ef4444]">
          <div className="container mx-auto px-4 text-center">
            <Sparkles className="w-10 h-10 text-white/80 mx-auto mb-4" />
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">Ready to start your healing journey?</h2>
            <p className="text-lg text-yellow-100 mb-10 max-w-2xl mx-auto">Join thousands of others who have found clarity and peace. Your first 5-minute consultation is completely free.</p>
            <Link href="/signup">
              <Button size="lg" className="bg-white text-[#d97706] hover:bg-yellow-50 h-14 px-10 text-lg rounded-full font-extrabold border-0 shadow-lg">
                Create Free Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-yellow-100 bg-white py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
            <span className="text-lg font-extrabold text-[#f59e0b]">HealConnect</span>
          </div>
          <p className="text-gray-400 text-sm">© 2026 Tara Infotech. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link href="#" className="hover:text-[#f59e0b]">Privacy Policy</Link>
            <Link href="#" className="hover:text-[#f59e0b]">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
