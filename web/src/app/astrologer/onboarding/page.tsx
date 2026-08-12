'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Star, ChevronRight, ChevronLeft, CheckCircle, Upload, X, FileText } from 'lucide-react';

const STEPS = ['Basic Info', 'Experience', 'Verification'];
const SPECIALIZATIONS = ['Vedic Astrology', 'Tarot', 'Numerology', 'Vastu', 'KP Astrology', 'Western Astrology', 'Palmistry', 'Face Reading'];
const LANGUAGES = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'];

export default function AstrologerOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fullLegalName: '',
    displayName: '',
    gender: '',
    city: '',
    state: '',
    specializations: [] as string[],
    languages: [] as string[],
    astrologyExperienceYears: '',
    professionalConsultationYears: '',
    professionalBio: '',
    previousPlatformExperience: '',
    idDocType: '',
    verificationType: '',
    platformProfileUrl: '',
  });

  // Document upload state
  const [idFile, setIdFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<{ id: string; documentType: string; originalName: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = (key: 'specializations' | 'languages', val: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));
  };

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    Promise.all([
      astrologerApi.getApplication(token),
      astrologerApi.getDocuments(token),
    ]).then(([appRes, docsRes]) => {
      if (appRes.success && appRes.data?.profile) {
        const p = appRes.data.profile;
        if (p.applicationStatus === 'APPROVED' && p.accountStatus === 'ACTIVE') {
          router.replace('/astrologer/dashboard');
          return;
        }
        if (['ADMIN_REVIEW', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED'].includes(p.applicationStatus)) {
          setSubmitted(true);
          return;
        }
        setForm((f) => ({
          ...f,
          fullLegalName: p.fullLegalName ?? '',
          displayName: p.displayName ?? '',
          gender: p.gender ?? '',
          city: p.city ?? '',
          state: p.state ?? '',
          specializations: p.specializations ?? [],
          languages: p.languages ?? [],
          astrologyExperienceYears: p.astrologyExperienceYears ? String(p.astrologyExperienceYears) : '',
          professionalConsultationYears: p.professionalConsultationYears ? String(p.professionalConsultationYears) : '',
          professionalBio: p.professionalBio ?? '',
          previousPlatformExperience: p.previousPlatformExperience ?? '',
        }));
        if (p.application?.step) setStep(Math.min(p.application.step - 1, 2));
      }
      if (docsRes.success && docsRes.data?.documents) {
        setUploadedDocs(docsRes.data.documents);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  const saveStep = async (nextStep: number) => {
    const token = astrologerTokenStore.getAccess();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      await astrologerApi.updateApplication(token, {
        ...form,
        astrologyExperienceYears: Number(form.astrologyExperienceYears) || 0,
        professionalConsultationYears: Number(form.professionalConsultationYears) || 0,
        step: nextStep + 1,
      });
      setStep(nextStep);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File, documentType: string) => {
    const token = astrologerTokenStore.getAccess();
    if (!token) return null;
    const res = await astrologerApi.uploadDocument(token, file, documentType);
    if (res.success && res.data?.document) {
      setUploadedDocs((prev) => [...prev.filter((d) => d.documentType !== documentType), res.data!.document]);
      return res.data.document;
    }
    throw new Error(res.message || 'Upload failed');
  };

  const handleSubmit = async () => {
    const token = astrologerTokenStore.getAccess();
    if (!token) return;

    // Validate: at least ID doc must be uploaded
    const hasIdDoc = uploadedDocs.some((d) => d.documentType === 'IDENTITY') || idFile;
    if (!hasIdDoc) {
      setError('Please upload your ID document (Aadhaar/PAN/Passport).');
      return;
    }
    if (!form.idDocType) {
      setError('Please select your ID document type.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      setUploading(true);
      // Upload files if selected
      if (idFile) await uploadFile(idFile, 'IDENTITY');
      if (proofFile) await uploadFile(proofFile, 'CERTIFICATE');
      setUploading(false);

      await astrologerApi.submitVerification(token, {
        idDocType: form.idDocType,
        verificationType: form.verificationType,
        platformProfileUrl: form.platformProfileUrl,
      });
      setSubmitted(true);
    } catch (err: any) {
      setUploading(false);
      setError(err?.message || 'Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (submitted) {
    const profile = astrologerTokenStore.getProfile();
    const displayName = profile?.displayName || form.displayName || 'Astrologer';
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full space-y-4">
          {/* Success card */}
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Application Submitted!</h1>
            <p className="text-amber-600 font-medium text-sm mb-3">Welcome, {displayName} 🙏</p>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your application is now under review. Our team carefully verifies every astrologer to maintain platform quality.
            </p>
          </div>

          {/* Status tracker */}
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">Application Status</h2>
            <div className="space-y-3">
              {[
                { label: 'Application Received', desc: 'Your details have been saved', done: true },
                { label: 'Document Verification', desc: 'ID & professional credentials check', done: false, active: true },
                { label: 'Admin Review', desc: 'Final approval by our team', done: false },
                { label: 'Account Activated', desc: 'Start taking consultations', done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold ${
                    item.done ? 'bg-green-500 text-white' :
                    item.active ? 'bg-amber-500 text-white ring-4 ring-amber-100' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {item.done ? '✓' : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${item.done || item.active ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</p>
                    <p className={`text-xs ${item.done || item.active ? 'text-gray-500' : 'text-gray-300'}`}>{item.desc}</p>
                  </div>
                  {item.active && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">In Progress</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* What to expect */}
          <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">What Happens Next?</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">📱</span> You'll receive an SMS on your registered number once reviewed</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">⏱️</span> Review typically takes <strong>2–3 business days</strong></li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✅</span> On approval, your account goes live and you can start earning</li>
              <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">❓</span> If more info is needed, our team will contact you directly</li>
            </ul>
          </div>

          <button
            onClick={() => { astrologerTokenStore.clear(); window.location.href = '/astrologer/login'; }}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign out and come back later →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-3">
            <Star className="w-4 h-4" /> Astrologer Application
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i <= step ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-sm hidden sm:block ${i === step ? 'text-amber-600 font-semibold' : 'text-gray-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-amber-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Basic Information</h2>
              {[
                { id: 'fullLegalName', label: 'Full Legal Name', placeholder: 'As per government ID' },
                { id: 'displayName', label: 'Display Name', placeholder: 'Name shown to clients' },
                { id: 'city', label: 'City', placeholder: 'Your city' },
                { id: 'state', label: 'State', placeholder: 'Your state' },
              ].map(({ id, label, placeholder }) => (
                <div key={id}>
                  <Label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</Label>
                  <Input id={id} placeholder={placeholder} value={(form as any)[id]} onChange={(e) => set(id, e.target.value)} className="mt-1" />
                </div>
              ))}
              <div>
                <Label className="text-sm font-medium text-gray-700">Gender</Label>
                <div className="flex gap-3 mt-1">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button key={g} type="button" onClick={() => set('gender', g)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.gender === g ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Experience */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900 text-lg mb-2">Experience & Expertise</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Astrology Experience (yrs)</Label>
                  <Input type="number" min="0" value={form.astrologyExperienceYears} onChange={(e) => set('astrologyExperienceYears', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Consultation Experience (yrs)</Label>
                  <Input type="number" min="0" value={form.professionalConsultationYears} onChange={(e) => set('professionalConsultationYears', e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Specializations</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((s) => (
                    <button key={s} type="button" onClick={() => toggleArr('specializations', s)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${form.specializations.includes(s) ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <button key={l} type="button" onClick={() => toggleArr('languages', l)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${form.languages.includes(l) ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Professional Bio</Label>
                <textarea
                  rows={4}
                  placeholder="Tell clients about your expertise and approach..."
                  value={form.professionalBio}
                  onChange={(e) => set('professionalBio', e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Previous Platform Experience</Label>
                <Input placeholder="e.g. AstroTalk, Guruji, Vedic Meet (optional)" value={form.previousPlatformExperience} onChange={(e) => set('previousPlatformExperience', e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {/* Step 2: Verification */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900 text-lg mb-1">Identity & Professional Verification</h2>
              <p className="text-xs text-gray-500">Upload real documents — our team reviews them before approving your account.</p>

              {/* ID Document */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">ID Document Type <span className="text-red-500">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE'].map((d) => (
                    <button key={d} type="button" onClick={() => set('idDocType', d)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.idDocType === d ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                      {d.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* ID file upload */}
                <div className="mt-2">
                  <input ref={idInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                    onChange={(e) => setIdFile(e.target.files?.[0] ?? null)} />
                  {uploadedDocs.find((d) => d.documentType === 'IDENTITY') && !idFile ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{uploadedDocs.find((d) => d.documentType === 'IDENTITY')!.originalName}</span>
                      <button type="button" onClick={() => setUploadedDocs((p) => p.filter((d) => d.documentType !== 'IDENTITY'))} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : idFile ? (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{idFile.name}</span>
                      <button type="button" onClick={() => { setIdFile(null); if (idInputRef.current) idInputRef.current.value = ''; }} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => idInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
                      <Upload className="w-4 h-4" /> Upload ID Document (JPG, PNG, PDF · max 5MB)
                    </button>
                  )}
                </div>
              </div>

              {/* Professional Proof */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Professional Proof Type</Label>
                <div className="flex flex-wrap gap-2">
                  {['CERTIFICATE', 'PLATFORM_PROFILE', 'WEBSITE', 'EXPERIENCE'].map((v) => (
                    <button key={v} type="button" onClick={() => set('verificationType', v)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${form.verificationType === v ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                      {v.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {form.verificationType === 'PLATFORM_PROFILE' && (
                  <Input placeholder="Your AstroTalk / Guruji profile URL" value={form.platformProfileUrl} onChange={(e) => set('platformProfileUrl', e.target.value)} className="mt-1" />
                )}

                {/* Certificate / proof file upload */}
                {(form.verificationType === 'CERTIFICATE' || form.verificationType === 'EXPERIENCE') && (
                  <div className="mt-1">
                    <input ref={proofInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
                    {uploadedDocs.find((d) => d.documentType === 'CERTIFICATE') && !proofFile ? (
                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{uploadedDocs.find((d) => d.documentType === 'CERTIFICATE')!.originalName}</span>
                        <button type="button" onClick={() => setUploadedDocs((p) => p.filter((d) => d.documentType !== 'CERTIFICATE'))} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ) : proofFile ? (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{proofFile.name}</span>
                        <button type="button" onClick={() => { setProofFile(null); if (proofInputRef.current) proofInputRef.current.value = ''; }} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => proofInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
                        <Upload className="w-4 h-4" /> Upload Certificate / Proof (JPG, PNG, PDF · max 5MB)
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400">Documents are stored securely and only reviewed by our verification team.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : <div />}

            {step < STEPS.length - 1 ? (
              <Button onClick={() => saveStep(step + 1)} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save & Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving || uploading} className="bg-green-600 hover:bg-green-700 text-white">
                {(saving || uploading) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {uploading ? 'Uploading...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
