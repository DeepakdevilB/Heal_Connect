'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { astrologerApi, astrologerTokenStore } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronLeft, Upload, CheckCircle, X, FileText, ShieldCheck, AlertCircle } from 'lucide-react';

type DocSlot = {
  key: string;
  label: string;
  required: boolean;
  hint: string;
  accept: string;
};

const DOC_SLOTS: DocSlot[] = [
  { key: 'AADHAAR',     label: 'Aadhaar Card',              required: true,  hint: 'Front & back clearly visible · JPG, PNG, PDF · max 5MB', accept: 'image/jpeg,image/png,image/webp,application/pdf' },
  { key: 'CERTIFICATE', label: 'Astrology Certificate',     required: false, hint: 'Any recognized astrology course certificate',            accept: 'image/jpeg,image/png,image/webp,application/pdf' },
  { key: 'DEGREE',      label: 'Degree / Diploma',          required: false, hint: 'Academic degree or diploma (any field)',                  accept: 'image/jpeg,image/png,image/webp,application/pdf' },
  { key: 'PAN',         label: 'PAN Card',                  required: false, hint: 'Required for earnings & tax purposes',                   accept: 'image/jpeg,image/png,image/webp,application/pdf' },
  { key: 'PASSPORT',    label: 'Passport (if applicable)',  required: false, hint: 'For international experts',                              accept: 'image/jpeg,image/png,image/webp,application/pdf' },
];

export default function AstrologerVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // file state per slot
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploaded, setUploaded] = useState<Record<string, { name: string; url?: string }>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    Promise.all([
      astrologerApi.getApplication(token),
      astrologerApi.getDocuments(token),
    ]).then(([appRes, docsRes]) => {
      if (!appRes.success) { astrologerTokenStore.clear(); router.replace('/astrologer/login'); return; }
      const p = appRes.data?.profile;
      if (p) {
        if (p.applicationStatus === 'APPROVED' && p.accountStatus === 'ACTIVE') { router.replace('/astrologer/dashboard'); return; }
        if (['ADMIN_REVIEW', 'UNDER_REVIEW', 'PENDING_REVIEW', 'SUBMITTED'].includes(p.applicationStatus)) { router.replace('/astrologer/onboarding/submitted'); return; }
      }
      if (docsRes.success && docsRes.data?.documents) {
        const map: Record<string, { name: string }> = {};
        for (const d of docsRes.data.documents) {
          map[d.documentType] = { name: d.originalName };
        }
        setUploaded(map);
      }
      setLoading(false);
    }).catch(() => router.replace('/astrologer/login'));
  }, [router]);

  const handleFileSelect = (key: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError(`${key}: File must be under 5MB.`); return; }
    setFiles((prev) => ({ ...prev, [key]: file }));
    setError('');
  };

  const handleUpload = async (key: string) => {
    const file = files[key];
    if (!file) return;
    const token = astrologerTokenStore.getAccess();
    if (!token) return;

    setUploadProgress((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await astrologerApi.uploadDocument(token, file, key);
      if (res.success) {
        setUploaded((prev) => ({ ...prev, [key]: { name: file.name } }));
        setFiles((prev) => ({ ...prev, [key]: null }));
      } else {
        setError(res.message || 'Upload failed.');
      }
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploadProgress((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSubmit = async () => {
    if (!uploaded['AADHAAR'] && !files['AADHAAR']) {
      setError('Aadhaar Card is mandatory. Please upload it before submitting.');
      return;
    }

    const token = astrologerTokenStore.getAccess();
    if (!token) { router.replace('/astrologer/login'); return; }

    setSubmitting(true);
    setError('');
    try {
      // Upload any pending files first
      for (const slot of DOC_SLOTS) {
        if (files[slot.key]) await handleUpload(slot.key);
      }

      await astrologerApi.submitVerification(token, {
        idDocType: 'AADHAAR',
        verificationType: uploaded['CERTIFICATE'] || files['CERTIFICATE'] ? 'CERTIFICATE' : 'EXPERIENCE',
        platformProfileUrl: '',
      });
      router.push('/astrologer/onboarding/submitted');
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
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
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-extrabold text-gray-900">Identity Verification</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Upload your documents for verification. Aadhaar is mandatory. All documents are stored securely and reviewed only by our team.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {DOC_SLOTS.map((slot) => {
            const isUploaded = !!uploaded[slot.key];
            const selectedFile = files[slot.key];
            const isUploading = uploadProgress[slot.key];

            return (
              <div key={slot.key} className={`bg-white rounded-2xl border p-5 shadow-sm ${slot.required ? 'border-amber-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{slot.label}</span>
                      {slot.required && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Required</span>
                      )}
                      {isUploaded && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Uploaded
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{slot.hint}</p>
                  </div>
                </div>

                {/* Already uploaded */}
                {isUploaded && !selectedFile ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{uploaded[slot.key].name}</span>
                    <button
                      type="button"
                      onClick={() => setUploaded((prev) => { const n = { ...prev }; delete n[slot.key]; return n; })}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : selectedFile ? (
                  /* File selected, not yet uploaded */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate flex-1">{selectedFile.name}</span>
                      <button
                        type="button"
                        onClick={() => { setFiles((prev) => ({ ...prev, [slot.key]: null })); if (inputRefs.current[slot.key]) inputRefs.current[slot.key]!.value = ''; }}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpload(slot.key)}
                      disabled={isUploading}
                      className="w-full py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isUploading ? 'Uploading...' : 'Upload Now'}
                    </button>
                  </div>
                ) : (
                  /* Empty — show drop zone */
                  <button
                    type="button"
                    onClick={() => inputRefs.current[slot.key]?.click()}
                    className={`w-full flex items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl text-sm transition-colors ${
                      slot.required
                        ? 'border-amber-300 text-amber-600 hover:bg-amber-50'
                        : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'
                    }`}
                  >
                    <Upload className="w-5 h-5" />
                    Click to select file
                  </button>
                )}

                <input
                  ref={(el) => { inputRefs.current[slot.key] = el; }}
                  type="file"
                  accept={slot.accept}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(slot.key, f); }}
                />
              </div>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Your documents are safe</p>
            <p className="text-xs text-blue-600">All uploaded documents are encrypted and only accessible to our verification team. They are never shared with clients.</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pb-6">
          <Button variant="outline" onClick={() => router.push('/astrologer/onboarding/profile')} disabled={submitting}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 h-12 rounded-full shadow-lg border-0"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>

      </div>
    </div>
  );
}
