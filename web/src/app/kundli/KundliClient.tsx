'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Star, User, Calendar, Clock, MapPin, Search, ArrowRight,
  Check, ChevronDown, ChevronUp, RefreshCw, BookOpen, Shield, Flame,
  Heart, Coins, Briefcase, Info, Sun, Layers, X
} from 'lucide-react';
import Navbar from '@/components/navbar';

// --- 12 HOUSES DATA ---
const HOUSES_DATA = [
  { num: 1, name: 'Lagna Bhava (1st House)', domain: 'Self & Physical Body', desc: 'Governs physical appearance, vitality, core personality, and basic drive in life.' },
  { num: 2, name: 'Dhana Bhava (2nd House)', domain: 'Wealth & Family', desc: 'Represents accumulated wealth, personal finances, family lineage, speech, and values.' },
  { num: 3, name: 'Sahaja Bhava (3rd House)', domain: 'Courage & Siblings', desc: 'Controls bravery, communication skills, younger siblings, short travels, and personal effort.' },
  { num: 4, name: 'Bandhu Bhava (4th House)', domain: 'Home, Mother & Happiness', desc: 'Governs emotional peace, mother relationship, real estate, vehicles, and domestic comfort.' },
  { num: 5, name: 'Putra Bhava (5th House)', domain: 'Children & Intelligence', desc: 'Represents creative intellect, romance, children, past life merits, and higher learning.' },
  { num: 6, name: 'Ari Bhava (6th House)', domain: 'Health, Enemies & Debts', desc: 'Governs daily routines, physical ailments, litigation, competitive exams, and obstacles.' },
  { num: 7, name: 'Yuvati Bhava (7th House)', domain: 'Marriage & Business', desc: 'Controls spouse characteristics, marital harmony, business legal agreements, and public relations.' },
  { num: 8, name: 'Randhra Bhava (8th House)', domain: 'Longevity & Transformation', desc: 'Governs secrets, occult knowledge, inheritances, research, and sudden life shifts.' },
  { num: 9, name: 'Dharma Bhava (9th House)', domain: 'Fortune, Father & Dharma', desc: 'Represents luck (Bhagya), spiritual guru, higher wisdom, pilgrimages, and ethics.' },
  { num: 10, name: 'Karma Bhava (10th House)', domain: 'Career & Reputation', desc: 'Governs professional status, executive authority, career achievements, and public recognition.' },
  { num: 11, name: 'Labha Bhava (11th House)', domain: 'Gains & Aspirations', desc: 'Controls financial profits, elder siblings, social networks, wish fulfillment, and income.' },
  { num: 12, name: 'Vyaya Bhava (12th House)', domain: 'Losses, Foreign & Moksha', desc: 'Represents spiritual liberation, foreign travels, subconscious dreams, and hospitalizations.' }
];

// --- RELATED GUIDES ---
const RELATED_GUIDES = [
  {
    id: '1',
    title: 'How to Read Kundli',
    category: 'Basics',
    desc: 'Master reading Lagna, house lords, and planetary aspects step-by-step.',
    icon: BookOpen,
    image: '/guide_kundli_basics.jpg',
    readTime: '4 min read',
    guideContent: `
      <p>Reading a Janam Kundli begins with identifying your <strong>Lagna (Ascendant)</strong>, which is the 1st House located at the top center of the Vedic chart representation.</p>
      <h4 className="font-bold text-amber-800 text-sm mt-3">Step 1: Check the Lagna Lord</h4>
      <p>The sign number in the 1st house indicates your Ascendant. For example, 1 stands for Aries (ruled by Mars), 2 for Taurus (ruled by Venus). The house position of your Lagna lord dictates your main focus in life.</p>
      <h4 className="font-bold text-amber-800 text-sm mt-3">Step 2: Inspect Benefic vs Malefic Aspects</h4>
      <p>Jupiter, Venus, and Mercury are functional benefics that elevate whichever house they aspect. Saturn, Rahu, and Ketu bring lessons, discipline, and unexpected shifts.</p>
    `
  },
  {
    id: '2',
    title: '12 Houses in Vedic Astrology',
    category: 'Chart Analysis',
    desc: 'Understand how houses govern wealth, career, health, and marriage.',
    icon: Layers,
    image: '/guide_12_houses.jpg',
    readTime: '5 min read',
    guideContent: `
      <p>In Jyotish, the 12 houses are categorized into 4 fundamental pillars of life (Purusharthas):</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li><strong>Dharma Houses (1, 5, 9):</strong> Soul duty, wisdom, and spiritual path.</li>
        <li><strong>Artha Houses (2, 6, 10):</strong> Wealth, career status, and financial growth.</li>
        <li><strong>Kama Houses (3, 7, 11):</strong> Desires, relationships, and social networks.</li>
        <li><strong>Moksha Houses (4, 8, 12):</strong> Inner peace, occult, and spiritual liberation.</li>
      </ul>
    `
  },
  {
    id: '3',
    title: 'Planets & Their Qualities',
    category: 'Navgrahas',
    desc: 'Learn the functional benefics and malefic influences of the 9 Navgrahas.',
    icon: Sun,
    image: '/guide_navgrahas.jpg',
    readTime: '6 min read',
    guideContent: `
      <p>The 9 planets (Navgrahas) transmit specific cosmic energies:</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li><strong>Sun (Surya):</strong> Soul, confidence, father, leadership.</li>
        <li><strong>Moon (Chandra):</strong> Mind, emotions, mother, peace.</li>
        <li><strong>Mars (Mangal):</strong> Courage, energy, siblings, property.</li>
        <li><strong>Mercury (Budh):</strong> Intelligence, speech, commerce.</li>
        <li><strong>Jupiter (Guru):</strong> Wisdom, wealth, children, fortune.</li>
        <li><strong>Venus (Shukra):</strong> Love, luxury, arts, spouse.</li>
        <li><strong>Saturn (Shani):</strong> Discipline, karma, longevity, career.</li>
      </ul>
    `
  },
  {
    id: '4',
    title: 'Auspicious Vedic Yogas',
    category: 'Yogas',
    desc: 'Discover Gajakesari, Raj Yoga, Dhan Yoga, and Budhaditya Yoga alignments.',
    icon: Sparkles,
    image: '/guide_yogas.jpg',
    readTime: '5 min read',
    guideContent: `
      <p>Vedic Yogas are special planetary combinations that generate extraordinary wealth, fame, or wisdom:</p>
      <h4 className="font-bold text-amber-800 text-sm mt-3">Gajakesari Yoga</h4>
      <p>Formed when Jupiter is in a Kendra (1st, 4th, 7th, 10th house) from the Moon. Brings high reputation and intellectual authority.</p>
      <h4 className="font-bold text-amber-800 text-sm mt-3">Budhaditya Yoga</h4>
      <p>Formed by the conjunction of Sun and Mercury, granting sharp executive intelligence and analytical skills.</p>
    `
  },
  {
    id: '5',
    title: 'Malefic Doshas & Remedies',
    category: 'Doshas',
    desc: 'Identify Mangal, Kaal Sarp, Pitra, and Shani Sade Sati remedies.',
    icon: Flame,
    image: '/guide_doshas.jpg',
    readTime: '6 min read',
    guideContent: `
      <p>Planetary afflictions (Doshas) occur due to past karmic imbalance. Vedic Astrology provides practical remedies:</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li><strong>Mangal Dosha:</strong> Recite Hanuman Chalisa and donate red lentils.</li>
        <li><strong>Kaal Sarp Dosha:</strong> Perform Rahu-Ketu Jaap and Mahamrityunjaya Mantra.</li>
        <li><strong>Shani Sade Sati:</strong> Light mustard oil lamp under Peepal tree on Saturdays.</li>
      </ul>
    `
  },
  {
    id: '6',
    title: '27 Nakshatras & Padas',
    category: 'Constellations',
    desc: 'Explore stellar constellations governing your emotional Moon rashi.',
    icon: Star,
    image: '/guide_nakshatras.jpg',
    readTime: '4 min read',
    guideContent: `
      <p>The 360° zodiac is divided into 27 Nakshatras of 13°20' each. Each Nakshatra is divided into 4 Padas (quarters) and ruled by a specific deity and planet, giving nuanced insight into emotional traits and life timing.</p>
    `
  }
];

// --- SAMPLE SAVED KUNDLIS ---
const SAMPLE_SAVED = [
  { id: '1', name: 'Rohan Sharma', gender: 'Male', dob: '1995-04-12', tob: '08:30 AM', pob: 'New Delhi, India', lagna: 'Aries', rashi: 'Leo' },
  { id: '2', name: 'Ananya Verma', gender: 'Female', dob: '1998-08-25', tob: '02:15 PM', pob: 'Mumbai, India', lagna: 'Scorpio', rashi: 'Pisces' },
  { id: '3', name: 'Vikram Patel', gender: 'Male', dob: '1992-11-05', tob: '10:45 PM', pob: 'Bengaluru, India', lagna: 'Taurus', rashi: 'Capricorn' }
];

// --- FAQS ---
const FAQS = [
  { q: 'What is a Janam Kundli?', a: 'A Janam Kundli (Birth Chart) is an astrological snapshot of the heavens at the exact moment and place of your birth. It maps out planetary placements across 12 houses to reveal your life path, character, career, health, and relationships.' },
  { q: 'How accurate is this online Kundli generator?', a: 'HealConnect Kundli Generator uses high-precision astronomical Swiss Ephemeris algorithms combined with classical Vedic Lahiri Ayanamsa principles to provide accurate planetary degrees, houses, and dashas.' },
  { q: 'What details are required to generate an accurate Kundli?', a: 'You need your exact Birth Date, Birth Time (hour, minute, AM/PM), and Birth City/Location. Accurate birth time ensures precise Lagna (Ascendant) calculation.' },
  { q: 'What is the difference between Lagna Chart (D1) and Navamsa Chart (D9)?', a: 'The Lagna Chart (D1) reflects physical reality and life events. The D9 Navamsa Chart reveals inner spiritual strength, marital compatibility, and life after age 30.' },
  { q: 'How do Vimshottari Dasha periods work?', a: 'Vimshottari Dasha is a 120-year planetary cycle dictating when specific life events unfold. The active Mahadasha planet governs current life opportunities and challenges.' },
  { q: 'What should I do if Mangal Dosha is present?', a: 'Vedic astrology provides highly effective remedies including specific mantra recitations, gemstone recommendations, fasting, and charity to balance planetary vibrations.' },
  { q: 'Can I save my generated Kundli?', a: 'Yes! Generated Kundlis are saved to your session allowing you to re-open your birth chart anytime with 1-click.' },
  { q: 'Does HealConnect offer professional consultations?', a: 'Yes! Connect with verified Vedic Astrologers for detailed 1-on-1 audio and video Kundli readings anytime on our platform.' }
];

// --- PLANET POSITIONS ---
const PLANETS = [
  { planet: 'Sun (Surya)', sign: 'Aries (Mesha)', deg: "14° 22'", house: 1, status: 'Exalted (Ucha)' },
  { planet: 'Moon (Chandra)', sign: 'Leo (Simha)', deg: "08° 45'", house: 5, status: 'Friendly' },
  { planet: 'Mars (Mangal)', sign: 'Scorpio', deg: "21° 10'", house: 8, status: 'Own Sign' },
  { planet: 'Mercury (Budh)', sign: 'Taurus', deg: "19° 04'", house: 2, status: 'Neutral' },
  { planet: 'Jupiter (Guru)', sign: 'Sagittarius', deg: "25° 30'", house: 9, status: 'Own Sign' },
  { planet: 'Venus (Shukra)', sign: 'Pisces', deg: "11° 15'", house: 12, status: 'Exalted' },
  { planet: 'Saturn (Shani)', sign: 'Aquarius', deg: "04° 50'", house: 11, status: 'Moolatrikona' },
  { planet: 'Rahu', sign: 'Gemini', deg: "15° 20'", house: 3, status: 'Exalted' },
  { planet: 'Ketu', sign: 'Sagittarius', deg: "15° 20'", house: 9, status: 'Exalted' }
];

// --- DOSHAS & REMEDIES ---
const DOSHAS = [
  { title: 'Mangal Dosha (Manglik)', icon: Flame, color: 'text-orange-500', text: 'Occurs when Mars is placed in the 1st, 4th, 7th, 8th, or 12th house. Can cause delays in marriage. Remedied through Hanuman Chalisa recitation, Kumbh Vivah, or coral gemstones.' },
  { title: 'Kaal Sarp Dosha', icon: Shield, color: 'text-amber-600', text: 'Formed when all seven planets are hemmed between Rahu and Ketu. Causes initial struggles followed by sudden success after age 33. Remedied through Rahu-Ketu mantra chanting.' },
  { title: 'Pitra Dosha', icon: Star, color: 'text-blue-500', text: 'Occurs when Sun is afflicted by Rahu or Ketu. Indicates unresolved ancestral karma. Remedied through Pitra Paksha donations, Tarpan rituals, and charity.' },
  { title: 'Shani Sade Sati', icon: RefreshCw, color: 'text-purple-500', text: 'A 7.5-year Saturn transit over your Moon Sign and adjacent signs. A period of hard work, lessons, and transformation followed by lasting rewards.' }
];

export default function KundliPage() {
  const [formData, setFormData] = useState({ name: '', gender: 'Male', dob: '', tob: '', pob: 'New Delhi, India' });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedKundli, setGeneratedKundli] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('lagna');
  const [savedSearch, setSavedSearch] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [timeAmPm, setTimeAmPm] = useState<'AM' | 'PM'>('AM');

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setGeneratedKundli({
        ...formData,
        tob: `${formData.tob || '08:30'} ${timeAmPm}`,
        lagnaSign: 'Aries (Mesha)',
        moonSign: 'Leo (Simha)',
        nakshatra: 'Magha',
        nakshatraPada: 2
      });
      setTimeout(() => document.getElementById('kundli-results')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 1400);
  };

  const filteredSaved = SAMPLE_SAVED.filter(k =>
    k.name.toLowerCase().includes(savedSearch.toLowerCase()) ||
    k.pob.toLowerCase().includes(savedSearch.toLowerCase())
  );

  const TABS = [
    { id: 'lagna', label: 'Lagna Chart (D1)', icon: Layers },
    { id: 'navamsa', label: 'Navamsa (D9)', icon: Star },
    { id: 'planets', label: 'Planetary Positions', icon: Sun },
    { id: 'dasha', label: 'Vimshottari Dasha', icon: Clock },
    { id: 'doshas', label: 'Yogas & Doshas', icon: Flame },
    { id: 'predictions', label: 'Life Predictions', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#fffbf0] text-gray-900 flex flex-col font-sans">
      <Navbar />

      {/* ══ HERO SECTION ══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 pt-28 pb-20 px-4 text-center text-white">
        <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10 space-y-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-yellow-200 animate-pulse" />
            <span>VEDIC ASTROLOGY • JANAM KUNDLI</span>
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-normal font-cursive tracking-wide text-white drop-shadow-md py-1">
            Free Online Kundli Generator
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-xl text-white/90 font-medium max-w-3xl mx-auto leading-relaxed">
            Generate your accurate Janam Kundli instantly using Vedic Astrology principles. Explore your birth chart, planetary positions, houses, yogas, doshas, dashas, career, marriage, finances, and more.
          </motion.p>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }} className="pt-2">
            <button onClick={() => document.getElementById('kundli-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white hover:bg-amber-50 text-amber-600 font-extrabold text-base rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 mx-auto">
              Generate Kundli <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      <main className="flex-grow container mx-auto px-4 py-12 max-w-6xl space-y-16">

        {/* ══ KUNDLI FORM SECTION ══ */}
        <section id="kundli-form" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-4xl md:text-6xl font-normal text-amber-600 font-cursive tracking-wide">Enter Your Birth Details</h2>
            <p className="text-gray-500 font-medium max-w-lg mx-auto text-sm">Provide exact birth information for precise Lagna Chart and Planetary calculations.</p>
          </div>

          <div className="bg-white/80 backdrop-blur-md border border-amber-200/80 rounded-3xl p-6 md:p-8 shadow-xl max-w-3xl mx-auto">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-500" /> Full Name *
                  </label>
                  <input type="text" required placeholder="Enter your full name" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Gender *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Male', 'Female'].map((g) => (
                      <button type="button" key={g} onClick={() => setFormData({ ...formData, gender: g })}
                        className={`py-3 rounded-2xl text-xs font-bold transition-all border ${formData.gender === g ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-amber-50/40 border-amber-200 text-gray-700 hover:bg-amber-100/50'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" /> Birth Date *
                  </label>
                  <input type="date" required value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Birth Time *
                  </label>
                  <div className="flex gap-2">
                    <input type="time" required value={formData.tob}
                      onChange={(e) => setFormData({ ...formData, tob: e.target.value })}
                      className="flex-1 px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" />
                    <div className="flex p-1 bg-amber-50/60 border border-amber-200 rounded-2xl gap-1 shrink-0">
                      {['AM', 'PM'].map((period) => (
                        <button type="button" key={period} onClick={() => setTimeAmPm(period as 'AM' | 'PM')}
                          className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all ${timeAmPm === period ? 'bg-amber-500 text-white shadow-md' : 'text-gray-600 hover:bg-amber-100/60'}`}>
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-500" /> Birth Place *
                </label>
                <input type="text" required placeholder="e.g. New Delhi, India" value={formData.pob}
                  onChange={(e) => setFormData({ ...formData, pob: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-amber-50/40 border border-amber-200 text-gray-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all" />
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75">
                {isLoading ? (<><RefreshCw className="w-5 h-5 animate-spin" /> Calculating Charts...</>) : (<><Sparkles className="w-5 h-5" /> Generate Kundli</>)}
              </button>
            </form>
          </div>
        </section>

        {/* ══ GENERATED KUNDLI RESULTS DASHBOARD ══ */}
        {generatedKundli && (
          <section id="kundli-results" className="space-y-6 pt-4">
            <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Janam Kundli Report</span>
                  <h2 className="text-2xl md:text-3xl font-black">{generatedKundli.name}</h2>
                  <p className="text-white/90 text-xs font-semibold">{generatedKundli.dob} • {generatedKundli.tob} • {generatedKundli.pob}</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs font-bold text-amber-950 bg-white/90 p-3 rounded-xl">
                  <div><span className="text-[10px] text-gray-500 font-semibold uppercase block">Lagna</span><span className="text-amber-800 font-extrabold">{generatedKundli.lagnaSign}</span></div>
                  <div><span className="text-[10px] text-gray-500 font-semibold uppercase block">Moon Sign</span><span className="text-amber-800 font-extrabold">{generatedKundli.moonSign}</span></div>
                  <div><span className="text-[10px] text-gray-500 font-semibold uppercase block">Nakshatra</span><span className="text-amber-800 font-extrabold">{generatedKundli.nakshatra}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-amber-100">
                {TABS.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 border ${activeTab === tab.id ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-amber-50/50 text-gray-700 border-amber-200 hover:bg-amber-100'}`}>
                    <tab.icon className="w-3.5 h-3.5" />{tab.label}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                {activeTab === 'lagna' && (
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="flex items-center justify-center p-4 bg-amber-50/30 rounded-3xl border border-amber-100">
                      <svg className="w-full max-w-xs h-auto" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="380" height="380" stroke="#d97706" strokeWidth="3" fill="#fffbf0" />
                        <line x1="10" y1="10" x2="390" y2="390" stroke="#d97706" strokeWidth="2" />
                        <line x1="390" y1="10" x2="10" y2="390" stroke="#d97706" strokeWidth="2" />
                        <polygon points="200,10 390,200 200,390 10,200" stroke="#b45309" strokeWidth="2.5" fill="none" />
                        <text x="200" y="110" textAnchor="middle" fill="#b45309" fontSize="13" fontWeight="bold">1 (Asc) Aries</text>
                        <text x="295" y="70" textAnchor="middle" fill="#78350f" fontSize="11">2 Moon</text>
                        <text x="345" y="140" textAnchor="middle" fill="#78350f" fontSize="11">3 Mars</text>
                        <text x="300" y="210" textAnchor="middle" fill="#78350f" fontSize="11">4 Merc</text>
                        <text x="345" y="285" textAnchor="middle" fill="#78350f" fontSize="11">5 Jup</text>
                        <text x="295" y="345" textAnchor="middle" fill="#78350f" fontSize="11">6 Venus</text>
                        <text x="200" y="305" textAnchor="middle" fill="#b45309" fontSize="13" fontWeight="bold">7 Saturn</text>
                        <text x="105" y="345" textAnchor="middle" fill="#78350f" fontSize="11">8 Rahu</text>
                        <text x="55" y="285" textAnchor="middle" fill="#78350f" fontSize="11">9 Ketu</text>
                        <text x="100" y="210" textAnchor="middle" fill="#78350f" fontSize="11">10</text>
                        <text x="55" y="140" textAnchor="middle" fill="#78350f" fontSize="11">11</text>
                        <text x="105" y="70" textAnchor="middle" fill="#78350f" fontSize="11">12</text>
                      </svg>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl font-extrabold text-gray-900">Lagna Chart (D1) Summary</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Your Ascendant is in <strong>Aries (Mesha)</strong>, ruled by Mars. This gives you a bold, energetic, and leadership-driven personality with strong executive instincts.</p>
                      <div className="space-y-2 text-xs font-semibold text-gray-700">
                        {[
                          '1st House (Lagna): Aries — Sun exalted, conferring strong vitality.',
                          '5th House (Intellect): Jupiter giving Budhaditya Yoga for wisdom.',
                          '10th House (Career): Saturn forming Sasa Raj Yoga for authority.'
                        ].map((item, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl">
                            <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /><span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'navamsa' && (
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="flex items-center justify-center p-4 bg-amber-50/30 rounded-3xl border border-amber-100">
                      <svg className="w-full max-w-xs h-auto" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="10" y="10" width="380" height="380" stroke="#d97706" strokeWidth="3" fill="#fffbf0" />
                        <line x1="10" y1="10" x2="390" y2="390" stroke="#d97706" strokeWidth="2" />
                        <line x1="390" y1="10" x2="10" y2="390" stroke="#d97706" strokeWidth="2" />
                        <polygon points="200,10 390,200 200,390 10,200" stroke="#b45309" strokeWidth="2.5" fill="none" />
                        <text x="200" y="195" textAnchor="middle" fill="#b45309" fontSize="14" fontWeight="bold">D9 Navamsa</text>
                        <text x="200" y="215" textAnchor="middle" fill="#78350f" fontSize="11">Spousal Harmony Chart</text>
                      </svg>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-xl font-extrabold text-gray-900">Navamsa Chart (D9) Analysis</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">The D9 Chart reveals inner spiritual strength, destiny after marriage, and the long-term fruits of your planetary positions.</p>
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-bold text-amber-900 space-y-1.5">
                        <p>Primary Navamsa Benefic: Venus in 7th House</p>
                        <p>Marital Compatibility Score: 85% High Harmony</p>
                        <p>Atmakaraka Planet: Jupiter (Soul Indicator)</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'planets' && (
                  <div className="overflow-x-auto rounded-2xl border border-amber-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-50 text-amber-900 uppercase font-extrabold border-b border-amber-200">
                        <tr><th className="p-3">Planet</th><th className="p-3">Rashi</th><th className="p-3">Degree</th><th className="p-3">House</th><th className="p-3">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                        {PLANETS.map((row, i) => (
                          <tr key={i} className="hover:bg-amber-50/40">
                            <td className="p-3 font-extrabold text-gray-900">{row.planet}</td>
                            <td className="p-3">{row.sign}</td>
                            <td className="p-3">{row.deg}</td>
                            <td className="p-3">House {row.house}</td>
                            <td className="p-3 text-amber-700 font-bold">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'dasha' && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-extrabold text-gray-900">Current Vimshottari Dasha Cycle</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Active Mahadasha</span>
                        <h4 className="text-xl font-black text-amber-900">Jupiter (Guru)</h4>
                        <p className="text-xs text-gray-600 font-medium">Duration: 2020 to 2036 (16 Years)</p>
                        <p className="text-xs text-gray-500">Brings wisdom, expansion, spiritual growth, and prosperity in career and family life.</p>
                      </div>
                      <div className="p-5 rounded-2xl bg-orange-50 border border-orange-200 space-y-2">
                        <span className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Active Antardasha</span>
                        <h4 className="text-xl font-black text-orange-900">Mercury (Budh)</h4>
                        <p className="text-xs text-gray-600 font-medium">Duration: Oct 2024 to Jan 2027</p>
                        <p className="text-xs text-gray-500">Excellent period for communication, technology, business deals, and intellectual achievements.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'doshas' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <h4 className="font-extrabold text-sm text-emerald-900 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" />Gajakesari Raj Yoga</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">Jupiter and Moon form a favorable angle, blessing with intellectual wisdom, financial gains, and high reputation.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                      <h4 className="font-extrabold text-sm text-amber-900 flex items-center gap-2"><Info className="w-4 h-4 text-amber-600" />Mild Mangal Dosha</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">Mars in 8th house creates mild Mangal Dosha. Easily resolved through matching with a compatible partner chart.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2">
                      <h4 className="font-extrabold text-sm text-blue-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-500" />Budhaditya Yoga</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">Sun and Mercury together create sharp intelligence, excellent communication, and analytical mastery.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                      <h4 className="font-extrabold text-sm text-rose-900 flex items-center gap-2"><Shield className="w-4 h-4 text-rose-500" />No Kaal Sarp Dosha</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">Planets are NOT hemmed between Rahu and Ketu. This is a positive indicator for steady life growth.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'predictions' && (
                  <div className="space-y-4">
                    {[
                      { title: 'Career & Ambition', icon: Briefcase, text: 'Strong 10th House Saturn brings steady executive growth in management, technology, or finance. Career peaks between ages 32-42.' },
                      { title: 'Marriage & Love', icon: Heart, text: 'Exalted 12th House Venus promises a supportive, emotionally attuned partner. Marriage is likely between ages 26-31.' },
                      { title: 'Wealth & Prosperity', icon: Coins, text: 'Jupiter in 9th House opens multiple passive revenue streams and long-term asset growth after age 35.' },
                    ].map((p, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><p.icon className="w-5 h-5" /></div>
                        <div><h4 className="font-extrabold text-sm text-gray-900">{p.title}</h4><p className="text-xs text-gray-600 leading-relaxed mt-1">{p.text}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ══ RELATED GUIDES SECTION ══ */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Astrology Learning Guides</h2>
            <p className="text-gray-500 font-medium text-xs">Master Vedic Astrology charts, planetary aspects, and dosha remedies.</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {RELATED_GUIDES.map((guide) => (
              <motion.div key={guide.id} whileHover={{ y: -4, scale: 1.02 }} onClick={() => setSelectedGuide(guide)}
                className="bg-white border border-amber-100 hover:border-amber-300 hover:shadow-lg rounded-3xl overflow-hidden transition-all space-y-3 cursor-pointer flex flex-col justify-between">
                <div>
                  <div className="relative h-44 w-full overflow-hidden">
                    <img src={guide.image} alt={guide.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow-md">
                      {guide.category}
                    </span>
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <guide.icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-extrabold text-gray-900 text-base leading-snug">{guide.title}</h3>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{guide.desc}</p>
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedGuide(guide); }}
                    className="w-full py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all">
                    Read Guide <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ══ 12 HOUSES EXPLAINED ══ */}
        <section className="bg-white border border-amber-100 rounded-3xl p-6 md:p-10 space-y-8 shadow-sm">
          <div className="space-y-3 max-w-3xl">
            <h2 className="text-3xl font-extrabold text-gray-900">What is Janam Kundli?</h2>
            <p className="text-sm text-gray-600 leading-relaxed">In classical Vedic Astrology (Jyotish), a Janam Kundli is your personalized birth chart calculated using the exact positions of the Sun, Moon, and planets at your birth time. It acts as a divine blueprint mapping your core personality, health tendencies, career achievements, marriage timing, and karmic life path across 12 distinct houses.</p>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-extrabold text-amber-800 tracking-tight">The 12 Houses of Kundli Explained</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {HOUSES_DATA.map((h) => (
                <div key={h.num} className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 space-y-3 hover:border-amber-300 transition-colors shadow-sm flex flex-col items-start">
                  <img src="/house_icon.jpg" alt="Vedic House Icon" className="w-12 h-12 rounded-xl object-cover shadow-md border-2 border-amber-300 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-gray-900">{h.name}</h4>
                    <p className="text-[11px] text-amber-700 font-bold">{h.domain}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{h.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ DOSHAS KNOWLEDGE ══ */}
        <section className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 md:p-10 space-y-6">
          <h2 className="text-3xl font-extrabold text-amber-900">Major Vedic Doshas and Remedies</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {DOSHAS.map((d, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-amber-100 space-y-2">
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2"><d.icon className={`w-4 h-4 ${d.color}`} />{d.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{d.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ FAQ SECTION ══ */}
        <section className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-4xl md:text-6xl font-normal text-amber-600 font-cursive tracking-wide">Frequently Asked Questions</h2>
            <p className="text-gray-500 font-medium text-xs">Common questions about birth charts, accuracy, and Vedic astrology predictions.</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="bg-white rounded-2xl border border-yellow-100 overflow-hidden hover:border-amber-200 transition-all">
                  <button onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-extrabold text-sm text-gray-900">
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-amber-500 shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="px-5 pb-5 text-xs md:text-sm text-gray-500 leading-relaxed pt-1 border-t border-gray-50">{faq.a}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ FINAL CTA ══ */}
        <section className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-8 md:p-12 text-center text-white relative overflow-hidden shadow-xl space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Ready to Discover Your Birth Chart?</h2>
            <p className="text-white/90 text-sm md:text-base font-medium">Unlock personalized Vedic astrology insights or consult with verified experts for 1-on-1 guidance.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-2">
            <button onClick={() => document.getElementById('kundli-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-amber-50 text-amber-600 font-extrabold text-sm rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95">Generate Kundli</button>
            <Link href="/practitioners" className="w-full sm:w-auto">
              <button className="w-full px-8 py-4 bg-amber-600/50 hover:bg-amber-600 text-white font-extrabold text-sm rounded-full border border-white/30 backdrop-blur-md shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                <Star className="w-4 h-4 text-yellow-200 fill-yellow-200" /> Talk to Astrologer
              </button>
            </Link>
          </div>
        </section>

      </main>

      {/* ══ GUIDE READER MODAL ══ */}
      <AnimatePresence>
        {selectedGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button onClick={() => setSelectedGuide(null)} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black text-white transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className="relative h-56 md:h-64 w-full">
                <img src={selectedGuide.image} alt={selectedGuide.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-6">
                  <div className="space-y-1 text-white">
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
                      {selectedGuide.category}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold leading-tight">{selectedGuide.title}</h2>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400 border-b border-gray-100 pb-3">
                  <span className="flex items-center gap-1.5 text-amber-700 font-extrabold">
                    <BookOpen className="w-4 h-4" /> HealConnect Guide
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {selectedGuide.readTime}
                  </span>
                </div>

                <div className="prose prose-amber max-w-none text-xs md:text-sm text-gray-700 space-y-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedGuide.guideContent }} />

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button onClick={() => setSelectedGuide(null)} className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-full shadow-md transition-all">
                    Close Guide
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ FOOTER ══ */}
      <footer className="bg-gradient-to-b from-amber-50 to-yellow-50 text-gray-700 pt-12 pb-6 border-t border-amber-100 mt-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-wrap gap-8 mb-10">
            <div className="w-full lg:w-72 text-center lg:text-left space-y-3">
              <div className="flex items-center gap-2 justify-center lg:justify-start">
                <Image src="/logo.png" alt="HealConnect" width={28} height={28} className="rounded-full" />
                <span className="text-lg font-extrabold text-amber-600">HealConnect</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">Your trusted companion for Janam Kundli calculations, Vedic Astrology insights, and emotional wellness.</p>
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { title: 'Kundli Tools', links: ['Kundli', 'Kundli Matching', 'Mahadasha', 'Dosha Analysis'] },
                { title: 'Free Calculators', links: ['Sade Sati', 'Manglik Calculator', 'Gemstone Guide', 'Panchang'] },
                { title: 'Astrology Guides', links: ['12 Houses', 'Navgrahas', 'Nakshatras', 'Astrology Blog'] },
                { title: 'HealConnect', links: ['About Us', 'Verified Experts', 'Privacy Policy', 'Contact Support'] }
              ].map((col) => (
                <div key={col.title}>
                  <h4 className="text-amber-800 font-bold text-sm mb-3">{col.title}</h4>
                  <ul className="space-y-1.5">
                    {col.links.map((link) => (
                      <li key={link}><Link href={link === 'Privacy Policy' ? '/privacy' : '/kundli'} className="text-xs text-gray-500 hover:text-amber-600 transition-colors">{link}</Link></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-amber-200 pt-6 text-center text-xs text-gray-500">
            <p>&copy; {new Date().getFullYear()} HealConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
