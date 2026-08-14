'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const COUNTRY_CODES = [
  { flag: '🇮🇳', code: '+91', country: 'India' },
  { flag: '🇺🇸', code: '+1',  country: 'USA' },
  { flag: '🇬🇧', code: '+44', country: 'UK' },
  { flag: '🇦🇪', code: '+971', country: 'UAE' },
  { flag: '🇸🇬', code: '+65', country: 'Singapore' },
  { flag: '🇦🇺', code: '+61', country: 'Australia' },
  { flag: '🇲🇾', code: '+60', country: 'Malaysia' },
  { flag: '🇨🇦', code: '+1',  country: 'Canada' },
];

const PRIMARY_SKILLS = [
  'Vedic Astrology', 'Western Astrology', 'KP Astrology', 'Lal Kitab',
  'Tarot Card Reading', 'Numerology', 'Vastu Shastra', 'Palmistry',
  'Face Reading', 'Reiki Healing', 'Chakra Balancing', 'Meditation',
  'Yoga', 'Ayurveda', 'Life Coaching', 'Spiritual Coaching',
];

const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi',
  'Odia', 'Urdu', 'Sanskrit',
];

export default function AstrologerOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [countryCode, setCountryCode] = useState('+91');
  const [countryFlag, setCountryFlag] = useState('🇮🇳');
  const [countryName, setCountryName] = useState('India');
  const [phoneNumber, setPhoneNumber] = useState(() => {
    if (typeof window === 'undefined') return '';
    const saved = localStorage.getItem('hca_phone') ?? '';
    const codes = ['+971', '+91', '+65', '+61', '+60', '+44', '+1'];
    for (const c of codes) {
      if (saved.startsWith(c)) return saved.slice(c.length);
    }
    return saved.replace(/\D/g, '');
  });
  const [fullName, setFullName] = useState('');
  const [primarySkill, setPrimarySkill] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [gender, setGender] = useState('');
  const [agreed, setAgreed] = useState(false);

  const toggleLanguage = (lang: string) =>
    setLanguages((prev) => prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]);

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    astrologerApi.getApplication(token).then((res) => {
      if (!res.success) { astrologerTokenStore.clear(); router.replace('/astrologer/login'); return; }
      const p = res.data?.profile;
      if (!p) { setLoading(false); return; }
      if (p.applicationStatus === 'APPROVED' && p.accountStatus === 'ACTIVE') {
        router.replace('/astrologer/dashboard'); return;
      }
      if (['ADMIN_REVIEW', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED'].includes(p.applicationStatus)) {
        router.replace('/astrologer/onboarding/submitted'); return;
      }
      // Pre-fill if returning
      if (p.fullLegalName) setFullName(p.fullLegalName);
      if (p.gender) setGender(p.gender);
      if (p.languages?.length) setLanguages(p.languages);
      if (p.specializations?.length) setPrimarySkill(p.specializations[0]);
      setLoading(false);
    }).catch(() => { router.replace('/astrologer/login'); });
  }, [router]);

  const handleNext = async () => {
    if (!phoneNumber.trim()) { setError('Enter your mobile number.'); return; }
    if (!fullName.trim()) { setError('Enter your full name.'); return; }
    if (!primarySkill) { setError('Select your primary skill.'); return; }
    if (languages.length === 0) { setError('Select at least one language.'); return; }
    if (!gender) { setError('Select your gender.'); return; }
    if (!agreed) { setError('Please agree to the Terms & Conditions.'); return; }

    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    setSaving(true);
    setError('');
    try {
      await astrologerApi.updateApplication(token, {
        fullLegalName: fullName,
        displayName: fullName,
        gender,
        languages,
        specializations: [primarySkill],
        step: 2,
      });
      router.push('/astrologer/onboarding/profile');
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffbf0]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Expert Registration</h1>
          <p className="text-gray-500 text-sm mt-2">Join HealConnect as a verified spiritual expert</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8 space-y-5">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Mobile Number */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">Mobile Number</Label>
            <div className="flex gap-2">
              {/* Country selector */}
              <div className="relative">                <select
                  value={countryCode}
                  onChange={(e) => {
                    const selected = COUNTRY_CODES.find((c) => c.code === e.target.value && c.country === e.target.options[e.target.selectedIndex].dataset.country);
                    const opt = COUNTRY_CODES[e.target.selectedIndex];
                    setCountryCode(opt.code);
                    setCountryFlag(opt.flag);
                    setCountryName(opt.country);
                  }}
                  className="h-11 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none cursor-pointer"
                >
                  {COUNTRY_CODES.map((c, i) => (
                    <option key={i} value={c.code} data-country={c.country}>
                      {c.flag} {c.code} {c.country}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {/* Number input */}
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s]/g, ''))}
                className="flex-1 h-11"
              />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">Full Name</Label>
            <Input
              id="fullName"
              placeholder="As per government ID"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 h-11"
            />
          </div>

          {/* Primary Skill */}
          <div>
            <Label htmlFor="primarySkill" className="text-sm font-medium text-gray-700">Primary Skill</Label>
            <div className="relative mt-1">
              <select
                id="primarySkill"
                value={primarySkill}
                onChange={(e) => setPrimarySkill(e.target.value)}
                className="w-full h-11 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none"
              >
                <option value="">Select your primary skill</option>
                {PRIMARY_SKILLS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Languages Known */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Languages Known
              {languages.length > 0 && <span className="ml-2 text-xs text-amber-600">({languages.length} selected)</span>}
            </Label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-colors ${
                    languages.includes(lang)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-gray-200 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <Label htmlFor="gender" className="text-sm font-medium text-gray-700">Gender</Label>
            <div className="relative mt-1">
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full h-11 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* T&C */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-amber-500 flex-shrink-0"
            />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-amber-600 underline hover:text-amber-700">Terms & Conditions</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-amber-600 underline hover:text-amber-700">Privacy Policy</a>
            </span>
          </label>

          {/* Next Button */}
          <Button
            onClick={handleNext}
            disabled={saving}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-full text-base shadow-lg border-0"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Continue <ChevronRight className="ml-2 w-4 h-4" />
          </Button>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Already registered?{' '}
          <a href="/astrologer/login" className="text-amber-600 hover:text-amber-700 font-medium">Sign in</a>
        </p>
      </div>
    </div>
  );
}
