import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Phone, ShieldCheck, Wallet, Sparkles, Star } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Sparkles className="h-6 w-6 text-indigo-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              HealConnect
            </span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-indigo-400 transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-indigo-400 transition-colors">Pricing</Link>
            <Link href="#experts" className="text-sm font-medium hover:text-indigo-400 transition-colors">Our Experts</Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" className="hidden sm:inline-flex hover:bg-accent hover:text-accent-foreground">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-indigo-900/20 from-indigo-100/50 via-background to-background"></div>
          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <Badge variant="outline" className="mb-6 border-indigo-500/30 text-indigo-300 bg-indigo-500/10 px-4 py-1.5 rounded-full">
              Your 1st Chat is 100% Free
            </Badge>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              Professional Wellness, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
                Anytime, Anywhere.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect with verified energy healers, Vastu experts, numerologists, and tarot readers instantly via chat or audio call.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-14 text-lg rounded-full shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] border-0">
                Claim Free Session Now
              </Button>
              <Button size="lg" variant="outline" className="border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 h-14 text-lg rounded-full backdrop-blur-sm transition-all">
                Browse Experts
              </Button>
            </div>
            
            <div className="mt-16 pt-10 border-t border-border/50 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
              <div className="flex flex-col items-center gap-2">
                <p className="text-3xl font-bold text-foreground">50K+</p>
                <p className="text-sm text-muted-foreground font-medium">Happy Users</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-3xl font-bold text-foreground">500+</p>
                <p className="text-sm text-muted-foreground font-medium">Verified Experts</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-6 h-6 fill-current" />
                  <Star className="w-6 h-6 fill-current" />
                  <Star className="w-6 h-6 fill-current" />
                  <Star className="w-6 h-6 fill-current" />
                  <Star className="w-6 h-6 fill-current" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">4.9/5 Average Rating</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section id="features" className="py-24 bg-muted/50 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to heal</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Our platform is designed to give you seamless access to spiritual and wellness guidance with just a tap.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card border-border hover:border-indigo-500/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 text-indigo-400" />
                  </div>
                  <CardTitle className="text-xl text-foreground">Live Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Instant text consultations. Private, secure, and available 24/7. Perfect for quick questions or deep readings.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:border-purple-500/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6 text-purple-400" />
                  </div>
                  <CardTitle className="text-xl text-foreground">Audio Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Connect voice-to-voice for a more personal healing experience. Crystal clear audio powered by global networks.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:border-emerald-500/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  </div>
                  <CardTitle className="text-xl text-foreground">Verified Experts</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Every practitioner undergoes a rigorous 5-step background and skill verification process to ensure quality.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="bg-card border-border hover:border-cyan-500/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                    <Wallet className="w-6 h-6 text-cyan-400" />
                  </div>
                  <CardTitle className="text-xl text-foreground">Smart Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    Pay only for what you use. Top up your secure wallet and be billed per minute with no hidden fees.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Our Experts Section */}
        <section id="experts" className="py-24 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet our top practitioners</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Connect with highly vetted spiritual guides and healers across the globe.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Expert 1 */}
              <Card className="bg-card border-border hover:border-indigo-500/30 transition-all text-center pt-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4">
                  RS
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-foreground">Rahul Sharma</CardTitle>
                  <CardDescription className="text-indigo-400 font-medium">Vedic Astrologer</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-4">
                    <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                    <span className="text-muted-foreground text-sm ml-2">(4.9)</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6 line-clamp-2">Expert in career and marriage guidance with over 15 years of experience.</p>
                  <Button variant="outline" className="w-full border-border hover:bg-accent text-foreground">View Profile</Button>
                </CardContent>
              </Card>

              {/* Expert 2 */}
              <Card className="bg-card border-border hover:border-indigo-500/30 transition-all text-center pt-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4">
                  AM
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-foreground">Anjali Menon</CardTitle>
                  <CardDescription className="text-emerald-400 font-medium">Tarot Reader & Reiki</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-4">
                    <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                    <span className="text-muted-foreground text-sm ml-2">(5.0)</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6 line-clamp-2">Specializes in energy healing and relationship clarity using Rider Waite tarot.</p>
                  <Button variant="outline" className="w-full border-border hover:bg-accent text-foreground">View Profile</Button>
                </CardContent>
              </Card>

              {/* Expert 3 */}
              <Card className="bg-card border-border hover:border-indigo-500/30 transition-all text-center pt-8">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 mx-auto flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4">
                  VK
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-foreground">Vikram Kapoor</CardTitle>
                  <CardDescription className="text-cyan-400 font-medium">Vastu Consultant</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-1 text-yellow-400 mb-4">
                    <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                    <span className="text-muted-foreground text-sm ml-2">(4.8)</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6 line-clamp-2">Transforming homes and businesses to align with positive cosmic energies.</p>
                  <Button variant="outline" className="w-full border-border hover:bg-accent text-foreground">View Profile</Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center mt-12">
               <Button variant="link" className="text-indigo-400 hover:text-indigo-300 text-lg">See all 500+ Experts &rarr;</Button>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-16">Recharge your wallet and pay per minute. No subscriptions. No commitments.</p>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="p-8 rounded-2xl bg-card border border-border flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-2 text-foreground">Starter Healers</h3>
                <div className="flex items-baseline gap-2 my-4">
                  <span className="text-4xl font-bold">₹10</span>
                  <span className="text-muted-foreground">/ min</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Verified professionals building their profiles.</p>
                <Button className="w-full bg-secondary hover:bg-slate-700 text-foreground border-0">View Experts</Button>
              </div>
              
              <div className="p-8 rounded-2xl bg-gradient-to-b from-indigo-900/40 to-slate-900 border border-indigo-500/30 flex flex-col items-center relative shadow-[0_0_30px_-10px_rgba(79,70,229,0.3)] transform md:-translate-y-4">
                <div className="absolute -top-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>
                <h3 className="text-xl font-semibold mb-2 text-indigo-300">Experienced Healers</h3>
                <div className="flex items-baseline gap-2 my-4">
                  <span className="text-4xl font-bold">₹25</span>
                  <span className="text-muted-foreground">/ min</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Top-rated experts with 5+ years of experience.</p>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0">View Experts</Button>
              </div>

              <div className="p-8 rounded-2xl bg-card border border-border flex flex-col items-center">
                <h3 className="text-xl font-semibold mb-2 text-purple-300">Master Healers</h3>
                <div className="flex items-baseline gap-2 my-4">
                  <span className="text-4xl font-bold">₹50+</span>
                  <span className="text-muted-foreground">/ min</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">Renowned industry veterans and celebrity healers.</p>
                <Button className="w-full bg-secondary hover:bg-slate-700 text-foreground border-0">View Experts</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-20 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl p-10 md:p-16 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10 opacity-30"></div>
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to start your healing journey?</h2>
                <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto">Join thousands of others who have found clarity and peace. Your first 5-minute consultation is completely free.</p>
                <Button size="lg" className="bg-white text-indigo-900 hover:bg-slate-100 h-14 px-8 text-lg rounded-full font-bold border-0">
                  Create Free Account
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <span className="text-lg font-bold">HealConnect</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 Tara Infotech. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="#" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
