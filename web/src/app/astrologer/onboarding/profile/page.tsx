'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronRight, ChevronLeft, Camera, Pencil } from 'lucide-react';

const CATEGORIES = [
  { label: 'Astrology', subs: ['Vedic Astrology (Jyotish)', 'Western Astrology', 'Lal Kitab Astrology', 'KP Astrology', 'Nadi Astrology', 'Chinese Astrology', 'Birth Chart Reading', 'Horoscope Reading', 'Relationship / Synastry', 'Career & Business Astrology'] },
  { label: 'Vastu & Space Harmony', subs: ['Vastu Shastra', 'Home Vastu', 'Business / Office Vastu', 'Online Floor-Plan Analysis', 'Feng Shui', 'Space / Energy Clearing'] },
  { label: 'Numerology', subs: ['Vedic Numerology', 'Chaldean Numerology', 'Pythagorean Numerology', 'Name Numerology', 'Business / Brand Numerology', 'Compatibility Numerology', 'Mobile / House Number Analysis'] },
  { label: 'Tarot, Psychic & Divination', subs: ['Tarot Card Reading', 'Psychic Reading', 'Intuitive Reading', 'Clairvoyance', 'Oracle Cards', 'Angel Cards', 'Lenormand', 'Runes', 'I Ching', 'Mediumship'] },
  { label: 'Energy & Spiritual Healing', subs: ['Reiki Healing', 'Cosmic Healing', 'Pranic Healing', 'Chakra Balancing', 'Sound Healing', 'Crystal Healing', 'Energy Clearing', 'Aura Cleansing / Balancing', 'Distance Energy Healing'] },
  { label: 'Akashic & Spiritual Guidance', subs: ['Akashic Records', 'Past-Life Reading', 'Soul-Purpose Guidance', 'Spiritual Coaching', 'Spiritual Mentoring', 'Manifestation Guidance', 'Angel Guidance', 'Mantra Guidance'] },
  { label: 'Emotional Wellbeing & Mind-Body Healing', subs: ['EFT (Emotional Freedom Techniques)', 'Tapping', 'Breathwork', "Ho'oponopono", 'Emotional Wellness Coaching', 'Somatic Practices', 'Emotional Release', 'Inner-Child Work', 'Stress Management', 'Mind-Body Practices'] },
  { label: 'Meditation & Mindfulness', subs: ['Meditation', 'Guided Meditation', 'Mindfulness', 'Cord Cutting Meditation', 'Yoga Nidra', 'Mantra Meditation', 'Visualization', 'Relaxation', 'Sleep Meditation', 'Spiritual Meditation'] },
  { label: 'Yoga & Breath Practices', subs: ['Yoga', 'Hatha Yoga', 'Vinyasa Yoga', 'Yin Yoga', 'Kundalini Yoga', 'Restorative Yoga', 'Prenatal Yoga', 'Pranayama', 'Private 1-to-1 Yoga'] },
  { label: 'Ayurveda & Holistic Wellness', subs: ['Ayurveda', 'Dosha Analysis', 'Ayurvedic Lifestyle Consultation', 'Dinacharya', 'Ayurvedic Nutrition / Lifestyle Guidance', 'Seasonal Wellness', 'Holistic Lifestyle Guidance'] },
  { label: 'Palmistry, Face & Personality Reading', subs: ['Palmistry', 'Face Reading', 'Hand Analysis', 'Finger / Hand Characteristics', 'Physiognomy', 'Personality Analysis'] },
  { label: 'Life Guidance', subs: ['Life Coaching', 'Relationship Guidance', 'Marriage & Compatibility Guidance', 'Career Guidance', 'Business Guidance', 'Life-Purpose Coaching', 'Manifestation Coaching', 'Confidence & Personal Growth', 'Spiritual Life Coaching'] },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 border-b border-amber-100 pb-2 mb-4">{children}</h3>
  );
}

export default function AstrologerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [openCats, setOpenCats] = useState<string[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    displayName: '',
    dob: '',
    email: '',
    hoursPerWeek: '',
    location: '',
    instagramUrl: '',
    youtubeUrl: '',
    linkedinUrl: '',
    whyHireYou: '',
    highestQualification: '',
    degreeDiploma: '',
    collegeName: '',
    learnedFrom: '',
    isFullTime: '',
    countriesLived: '',
    specializations: [] as string[],
  });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleSub = (sub: string) =>
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(sub)
        ? f.specializations.filter((s) => s !== sub)
        : [...f.specializations, sub],
    }));

  const toggleCat = (label: string) =>
    setOpenCats((prev) => prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]);

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    astrologerApi.getApplication(token).then((res) => {
      if (!res.success) { astrologerTokenStore.clear(); router.replace('/astrologer/login'); return; }
      const p = res.data?.profile;
      if (p) {
        if (p.applicationStatus === 'APPROVED' && p.accountStatus === 'ACTIVE') { router.replace('/astrologer/dashboard'); return; }
        if (['ADMIN_REVIEW', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED'].includes(p.applicationStatus)) { router.replace('/astrologer/onboarding/submitted'); return; }        setForm((f) => ({
          ...f,
          displayName: p.displayName ?? '',
          email: p.email ?? '',
          specializations: p.specializations ?? [],
          hoursPerWeek: p.hoursPerWeek ? String(p.hoursPerWeek) : '',
          location: p.location ?? '',
          instagramUrl: p.instagramUrl ?? '',
          youtubeUrl: p.youtubeUrl ?? '',
          linkedinUrl: p.linkedinUrl ?? '',
          whyHireYou: p.whyHireYou ?? '',
          highestQualification: p.highestQualification ?? '',
          degreeDiploma: p.degreeDiploma ?? '',
          collegeName: p.collegeName ?? '',
          learnedFrom: p.learnedFrom ?? '',
          isFullTime: p.isFullTime !== undefined ? String(p.isFullTime) : '',
          countriesLived: p.countriesLived ?? '',
          dob: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().slice(0, 10) : '',
        }));
        if (p.profilePhotoUrl) setPhotoPreview(p.profilePhotoUrl);
      }
      setLoading(false);
    }).catch(() => router.replace('/astrologer/login'));
  }, [router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleNext = async () => {
    if (!form.displayName.trim()) { setError('Enter your display name.'); return; }
    if (!form.dob) { setError('Enter your date of birth.'); return; }
    if (!form.email.trim()) { setError('Enter your email address.'); return; }
    if (form.specializations.length === 0) { setError('Select at least one specialization.'); return; }

    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    setSaving(true);
    setError('');
    try {
      // Upload photo if selected
      if (photoFile) {
        await astrologerApi.uploadDocument(token, photoFile, 'PROFILE_PHOTO');
      }

      await astrologerApi.updateApplication(token, {
        displayName: form.displayName,
        dateOfBirth: form.dob,
        email: form.email,
        specializations: form.specializations,
        hoursPerWeek: Number(form.hoursPerWeek) || 0,
        location: form.location,
        instagramUrl: form.instagramUrl,
        youtubeUrl: form.youtubeUrl,
        linkedinUrl: form.linkedinUrl,
        whyHireYou: form.whyHireYou,
        highestQualification: form.highestQualification,
        degreeDiploma: form.degreeDiploma,
        collegeName: form.collegeName,
        learnedFrom: form.learnedFrom,
        isFullTime: form.isFullTime === 'true',
        countriesLived: form.countriesLived,
        step: 3,
      });
      router.push('/astrologer/onboarding/verification');
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
    <div className="min-h-screen bg-[#fffbf0] py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-500 text-sm mt-1">This information will be shown to clients. Fill it carefully.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Profile Photo */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 flex flex-col items-center gap-4 sticky top-6">
              <div className="relative">
                <div className="w-36 h-36 rounded-full overflow-hidden bg-amber-50 border-4 border-amber-200 flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-12 h-12 text-amber-300" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute bottom-1 right-1 w-9 h-9 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center shadow-lg transition-colors"
                >
                  <Pencil className="w-4 h-4 text-white" />
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">{form.displayName || 'Your Name'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Click the pencil to upload photo</p>
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full py-2 text-sm border border-amber-300 text-amber-600 rounded-lg hover:bg-amber-50 transition-colors font-medium"
              >
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </button>
            </div>
          </div>

          {/* RIGHT — All Fields */}
          <div className="lg:col-span-2 space-y-6">

            {/* Basic Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
              <SectionTitle>Basic Details</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Display Name <span className="text-red-500">*</span></Label>
                  <Input placeholder="Name shown to clients" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Date of Birth <span className="text-red-500">*</span></Label>
                  <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email Address <span className="text-red-500">*</span></Label>
                  <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Hours Available per Week</Label>
                  <Input type="number" min="1" max="168" placeholder="e.g. 20" value={form.hoursPerWeek} onChange={(e) => set('hoursPerWeek', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Currently Working Full Time?</Label>
                  <div className="relative mt-1">
                    <select value={form.isFullTime} onChange={(e) => set('isFullTime', e.target.value)}
                      className="w-full h-10 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 appearance-none">
                      <option value="">Select</option>
                      <option value="true">Yes, Full Time</option>
                      <option value="false">No, Part Time / Freelance</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none rotate-90" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Current City, State, Country</Label>
                  <Input placeholder="e.g. Mumbai, Maharashtra, India" value={form.location} onChange={(e) => set('location', e.target.value)} className="mt-1" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Number of Countries Lived / Travelled</Label>
                  <Input placeholder="e.g. India, USA, UAE" value={form.countriesLived} onChange={(e) => set('countriesLived', e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Skill Categories */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
              <SectionTitle>
                Skill Categories & Subcategories
                {form.specializations.length > 0 && (
                  <span className="ml-2 text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-normal">{form.specializations.length} selected</span>
                )}
              </SectionTitle>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const isOpen = openCats.includes(cat.label);
                  const count = cat.subs.filter((s) => form.specializations.includes(s)).length;
                  return (
                    <div key={cat.label} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button type="button" onClick={() => toggleCat(cat.label)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-amber-50 transition-colors text-left">
                        <span className="text-sm font-medium text-gray-800">{cat.label}</span>
                        <div className="flex items-center gap-2">
                          {count > 0 && <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">{count}</span>}
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-4 py-3 flex flex-wrap gap-2 bg-white">
                          {cat.subs.map((sub) => (
                            <button key={sub} type="button" onClick={() => toggleSub(sub)}
                              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                form.specializations.includes(sub)
                                  ? 'bg-amber-500 text-white border-amber-500'
                                  : 'border-gray-200 text-gray-600 hover:border-amber-300'
                              }`}>
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Social & Online Presence */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
              <SectionTitle>Social & Online Presence</SectionTitle>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Instagram Profile URL</Label>
                  <Input placeholder="https://instagram.com/yourhandle" value={form.instagramUrl} onChange={(e) => set('instagramUrl', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">YouTube Channel URL</Label>
                  <Input placeholder="https://youtube.com/@yourchannel" value={form.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">LinkedIn Profile URL</Label>
                  <Input placeholder="https://linkedin.com/in/yourprofile" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Why Hire You */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
              <SectionTitle>Why Should Clients Choose You?</SectionTitle>
              <textarea
                rows={4}
                placeholder="Describe your unique approach, experience, and what makes you stand out..."
                value={form.whyHireYou}
                onChange={(e) => set('whyHireYou', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>

            {/* Education & Qualifications */}
            <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
              <SectionTitle>Education & Qualifications</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Highest Qualification</Label>
                  <Input placeholder="e.g. B.Sc, M.A, PhD" value={form.highestQualification} onChange={(e) => set('highestQualification', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Degree / Diploma in Astrology</Label>
                  <Input placeholder="e.g. Jyotish Visharad" value={form.degreeDiploma} onChange={(e) => set('degreeDiploma', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">College / School Name</Label>
                  <Input placeholder="Where did you study?" value={form.collegeName} onChange={(e) => set('collegeName', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Where Did You Learn Astrology?</Label>
                  <Input placeholder="e.g. Self-taught, Guru, Institute" value={form.learnedFrom} onChange={(e) => set('learnedFrom', e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pb-6">
              <Button variant="outline" onClick={() => router.push('/astrologer/onboarding')} disabled={saving}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button onClick={handleNext} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-8 h-12 rounded-full shadow-lg border-0">
                {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Save & Continue <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
