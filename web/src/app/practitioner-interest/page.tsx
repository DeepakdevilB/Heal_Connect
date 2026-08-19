'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const PRACTICE_AREAS = [
  {
    group: 'Astrology & Divination',
    items: ['Astrology', 'Numerology', 'Tarot', 'Oracle Cards', 'Psychic / Intuitive Reading', 'Mediumship', 'Akashic Records', 'Human Design', 'Gene Keys'],
  },
  {
    group: 'Spiritual & Esoteric',
    items: ['Spiritual Guidance', 'Spiritual Mentoring', 'Spiritual Coaching', 'Energy Healing', 'Chakra / Aura Work', 'Ancestral Work', 'Past Life Work', 'Shadow / Inner Child Work', 'Shamanic Practices'],
  },
  {
    group: 'Meditation & Consciousness',
    items: ['Meditation', 'Mindfulness', 'Breathwork', 'Manifestation', 'Spiritual / Consciousness Development'],
  },
  {
    group: 'Holistic Health & Wellbeing',
    items: ['Holistic Wellness', 'Nutrition', 'Herbalism', 'Ayurveda', 'Traditional Chinese Medicine', 'Yoga / Movement', 'Wellness Coaching'],
  },
  {
    group: 'Space & Environment',
    items: ['Feng Shui', 'Vastu Shastra', 'Space Clearing', 'Sacred Space', 'Home / Environmental Energy'],
  },
  {
    group: 'Coaching & Personal Development',
    items: ['Life Coaching', 'Relationship Guidance', 'Career / Life Purpose', 'Personal Development', 'Mindset / Transformation Coaching'],
  },
];

const EXPERIENCE_OPTIONS = ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years'];

const OFFERING_OPTIONS = [
  '1-to-1 sessions', 'Readings / Consultations', 'Coaching',
  'Healing / Energy sessions', 'Guidance / Mentoring',
  'Group sessions', 'Workshops', 'Courses', 'Other',
];

const VERIFICATION_OPTIONS = ['Yes', 'No', "I'd like to discuss this"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  fullName: string;
  businessName: string;
  email: string;
  location: string;
  website: string;
  // Step 2
  selectedAreas: string[];
  otherPractice: string;
  mainArea: string;
  experience: string;
  expertiseDevelopment: string;
  offerings: string[];
  practiceBio: string;
  whyZenAuraa: string;
  // Step 3
  anythingElse: string;
  verificationComfort: string;
}

const EMPTY: FormData = {
  fullName: '', businessName: '', email: '', location: '', website: '',
  selectedAreas: [], otherPractice: '', mainArea: '', experience: '',
  expertiseDevelopment: '', offerings: [], practiceBio: '', whyZenAuraa: '',
  anythingElse: '', verificationComfort: '',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            step > s ? 'bg-violet-600 text-white' :
            step === s ? 'bg-violet-600 text-white ring-4 ring-violet-100' :
            'bg-gray-100 text-gray-400'
          }`}>
            {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${step === s ? 'text-violet-700' : 'text-gray-400'}`}>
            {s === 1 ? 'About You' : s === 2 ? 'Your Practice' : 'Final Details'}
          </span>
          {s < 3 && <div className={`h-0.5 w-8 sm:w-16 rounded ${step > s ? 'bg-violet-600' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition bg-white";
const textareaCls = `${inputCls} resize-none`;

function Toggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600'
      }`}>
      {label}
    </button>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ form, set }: { form: FormData; set: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tell us about you</h2>
        <p className="text-sm text-gray-500 mt-1">Basic contact information so we can get in touch.</p>
      </div>
      <Field label="Full Name" required>
        <input className={inputCls} placeholder="Your full name" value={form.fullName} onChange={e => set('fullName', e.target.value)} />
      </Field>
      <Field label="Professional / Business Name">
        <input className={inputCls} placeholder="Optional" value={form.businessName} onChange={e => set('businessName', e.target.value)} />
      </Field>
      <Field label="Email" required>
        <input className={inputCls} type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
      </Field>
      <Field label="Where are you based?" required>
        <input className={inputCls} placeholder="Country / City" value={form.location} onChange={e => set('location', e.target.value)} />
      </Field>
      <Field label="Website or social media">
        <input className={inputCls} placeholder="Optional — link to your work" value={form.website} onChange={e => set('website', e.target.value)} />
      </Field>
    </div>
  );
}

function Step2({ form, setField, toggleArea, toggleOffering }: {
  form: FormData;
  setField: (k: keyof FormData, v: string) => void;
  toggleArea: (v: string) => void;
  toggleOffering: (v: string) => void;
}) {
  const allItems = PRACTICE_AREAS.flatMap(g => g.items);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">What do you offer?</h2>
        <p className="text-sm text-gray-500 mt-1">Tell us about your practice and experience.</p>
      </div>

      {/* Practice Areas */}
      <Field label="Which area(s) best describe your practice?" required>
        <div className="space-y-3 mt-1">
          {PRACTICE_AREAS.map(group => (
            <div key={group.group}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.group}</p>
              <div className="flex flex-wrap gap-2">
                {group.items.map(item => (
                  <Toggle key={item} label={item} active={form.selectedAreas.includes(item)} onClick={() => toggleArea(item)} />
                ))}
              </div>
            </div>
          ))}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Other</p>
            <textarea className={textareaCls} rows={2} placeholder="Please tell us about your practice..." value={form.otherPractice} onChange={e => setField('otherPractice', e.target.value)} />
          </div>
        </div>
      </Field>

      {/* Main Area */}
      <Field label="What is your main area of practice?" required>
        <select className={inputCls} value={form.mainArea} onChange={e => setField('mainArea', e.target.value)}>
          <option value="">Select one</option>
          {[...allItems, 'Other'].map(item => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </Field>

      {/* Experience */}
      <Field label="How long have you been practising?" required>
        <div className="flex flex-wrap gap-2 mt-1">
          {EXPERIENCE_OPTIONS.map(opt => (
            <Toggle key={opt} label={opt} active={form.experience === opt} onClick={() => setField('experience', opt)} />
          ))}
        </div>
      </Field>

      {/* Expertise Development */}
      <Field label="How did you develop your expertise?" required>
        <textarea className={textareaCls} rows={3}
          placeholder="e.g. formal training, certification, apprenticeship, mentorship, lineage, self-study, professional experience or a combination."
          value={form.expertiseDevelopment} onChange={e => setField('expertiseDevelopment', e.target.value)} />
      </Field>

      {/* Offerings */}
      <Field label="How do you work with clients online?" required>
        <p className="text-xs text-gray-400 mb-2">What would you like to offer through ZenAuraa?</p>
        <div className="flex flex-wrap gap-2">
          {OFFERING_OPTIONS.map(opt => (
            <Toggle key={opt} label={opt} active={form.offerings.includes(opt)} onClick={() => toggleOffering(opt)} />
          ))}
        </div>
      </Field>

      {/* Practice Bio */}
      <Field label="Tell us about your practice" required>
        <textarea className={textareaCls} rows={4}
          placeholder="What can someone expect when they work with you?"
          value={form.practiceBio} onChange={e => setField('practiceBio', e.target.value)} />
      </Field>

      {/* Why ZenAuraa */}
      <Field label="What interests you about ZenAuraa?" required>
        <textarea className={textareaCls} rows={3}
          placeholder="Tell us why you'd like to join our community..."
          value={form.whyZenAuraa} onChange={e => setField('whyZenAuraa', e.target.value)} />
      </Field>
    </div>
  );
}

function Step3({ form, setField }: { form: FormData; setField: (k: keyof FormData, v: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Final Details</h2>
        <p className="text-sm text-gray-500 mt-1">Almost done — just a couple more things.</p>
      </div>

      <Field label="Anything else you'd like us to know?">
        <textarea className={textareaCls} rows={4} placeholder="Optional." value={form.anythingElse} onChange={e => setField('anythingElse', e.target.value)} />
      </Field>

      <Field label="If we invite you to the next stage" required>
        <p className="text-xs text-gray-500 mb-3">
          Would you be comfortable taking part in a short conversation and, if you progress further, providing appropriate identification and/or supporting information about your practice?
        </p>
        <div className="space-y-2">
          {VERIFICATION_OPTIONS.map(opt => (
            <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              form.verificationComfort === opt ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-violet-200'
            }`}>
              <input type="radio" name="verification" value={opt} checked={form.verificationComfort === opt}
                onChange={() => setField('verificationComfort', opt)} className="accent-violet-600" />
              <span className="text-sm text-gray-700">{opt}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          We won't ask you to upload documents at this stage. Any further verification will depend on the nature of your practice.
        </p>
      </Field>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PractitionerInterestPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const toggleArea = (v: string) => setForm(f => ({
    ...f,
    selectedAreas: f.selectedAreas.includes(v) ? f.selectedAreas.filter(x => x !== v) : [...f.selectedAreas, v],
  }));

  const toggleOffering = (v: string) => setForm(f => ({
    ...f,
    offerings: f.offerings.includes(v) ? f.offerings.filter(x => x !== v) : [...f.offerings, v],
  }));

  const validate = () => {
    if (step === 1) {
      if (!form.fullName.trim()) return 'Full name is required.';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return 'Valid email is required.';
      if (!form.location.trim()) return 'Please tell us where you are based.';
    }
    if (step === 2) {
      if (form.selectedAreas.length === 0 && !form.otherPractice.trim()) return 'Please select at least one practice area.';
      if (!form.mainArea) return 'Please select your main area of practice.';
      if (!form.experience) return 'Please select how long you have been practising.';
      if (!form.expertiseDevelopment.trim()) return 'Please tell us how you developed your expertise.';
      if (form.offerings.length === 0) return 'Please select at least one offering.';
      if (!form.practiceBio.trim()) return 'Please tell us about your practice.';
      if (!form.whyZenAuraa.trim()) return 'Please tell us what interests you about ZenAuraa.';
    }
    if (step === 3) {
      if (!form.verificationComfort) return 'Please answer the verification question.';
    }
    return '';
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    // TODO: wire to backend API
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thank you for your interest in ZenAuraa.</h1>
            <p className="text-gray-500 mt-3 text-sm leading-relaxed">
              We'll review your application and be in touch if we'd like to invite you to the next stage.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-violet-600 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> ZenAuraa
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-violet-700 font-bold text-lg mb-2">
            <Sparkles className="w-5 h-5" /> ZenAuraa
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Practitioner Interest Form</h1>
          <p className="text-violet-600 font-medium mt-1 text-sm">Discover. Connect. Thrive.</p>
          {step === 1 && (
            <p className="text-gray-500 text-sm mt-4 max-w-lg mx-auto leading-relaxed">
              ZenAuraa is creating a curated online community connecting people with trusted practitioners across holistic health, astrology, spirituality, esoteric practices and personal development.
              <br /><br />
              This short form takes around 5 minutes. If we feel your practice could be a good fit, we'll be in touch.
            </p>
          )}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <ProgressBar step={step} />

          {error && (
            <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">{error}</div>
          )}

          {step === 1 && <Step1 form={form} set={set} />}
          {step === 2 && <Step2 form={form} setField={set} toggleArea={toggleArea} toggleOffering={toggleOffering} />}
          {step === 3 && <Step3 form={form} setField={set} />}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <button onClick={handleBack}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button onClick={handleNext}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm transition-colors">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-1.5 px-8 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition-colors">
                {submitting ? 'Submitting...' : 'Submit'}
                {!submitting && <CheckCircle2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          We welcome practitioners from all backgrounds — formal training, certification, mentorship, lineage, or years of practice.
        </p>
      </div>
    </div>
  );
}
