'use client';

import { useEffect, useState } from 'react';
import { adminAstrologerApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Eye, FileText, ExternalLink, Search } from 'lucide-react';

const ADMIN_KEY =
  typeof window !== 'undefined'
    ? (process.env['NEXT_PUBLIC_ADMIN_KEY'] ?? 'healconnect-admin-2026')
    : 'healconnect-admin-2026';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ADMIN_REVIEW: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  BLOCKED: 'bg-red-200 text-red-800',
  DRAFT: 'bg-gray-100 text-gray-500',
  PHONE_VERIFIED: 'bg-blue-100 text-blue-600',
  PROFILE_COMPLETED: 'bg-indigo-100 text-indigo-600',
};

export default function AdminAstrologersPage() {
  const [astrologers, setAstrologers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ADMIN_REVIEW');
  const [selected, setSelected] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async (page = 1) => {
    setLoading(true);
    const res = await adminAstrologerApi.list(ADMIN_KEY, { status: statusFilter || undefined, search: search || undefined, page, limit: 20 });
    if (res.success && res.data) {
      setAstrologers(res.data.astrologers);
      setPagination(res.data.pagination);
    }
    setLoading(false);
  };

  useEffect(() => { load(1); }, [statusFilter]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    setShowReject(false);
    setRejectReason('');
    const res = await adminAstrologerApi.get(ADMIN_KEY, id);
    if (res.success && res.data) setSelected(res.data);
    setDetailLoading(false);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    const res = await adminAstrologerApi.approve(ADMIN_KEY, selected.profile.id);
    if (res.success) {
      showToast('✅ Astrologer approved!');
      setSelected(null);
      load(pagination.page);
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setActionLoading(true);
    const res = await adminAstrologerApi.reject(ADMIN_KEY, selected.profile.id, rejectReason);
    if (res.success) {
      showToast('❌ Astrologer rejected.');
      setSelected(null);
      load(pagination.page);
    }
    setActionLoading(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Astrologer Applications</h1>
          <p className="text-sm text-gray-500 mt-0.5">{pagination.total} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search name / phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1)}
            className="pl-9 w-56"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['ADMIN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', ''].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${statusFilter === s ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
        ) : astrologers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No astrologers found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Docs</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {astrologers.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{a.displayName || a.fullLegalName || '—'}</p>
                    <p className="text-xs text-gray-400">{a.fullLegalName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.user?.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[a.applicationStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {a.applicationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {a.identityVerified && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">ID ✓</span>}
                      {a.professionalVerified && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Prof ✓</span>}
                      {!a.identityVerified && <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">ID ?</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {a.application?.submittedAt ? new Date(a.application.submittedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => openDetail(a.id)} className="gap-1">
                      <Eye className="w-3.5 h-3.5" /> Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => load(p)}
              className={`w-8 h-8 rounded-full text-sm font-medium ${p === pagination.page ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {(detailLoading || selected) && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            {detailLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
            ) : selected && (
              <>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selected.profile.displayName || selected.profile.fullLegalName}</h2>
                      <p className="text-sm text-gray-500">{selected.profile.user?.phone} · {selected.profile.user?.email || 'No email'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[selected.profile.applicationStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                      {selected.profile.applicationStatus}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Profile info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Experience:</span> <span className="font-medium">{selected.profile.astrologyExperienceYears} yrs</span></div>
                    <div><span className="text-gray-400">City:</span> <span className="font-medium">{selected.profile.city || '—'}, {selected.profile.state || '—'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400">Specializations:</span> <span className="font-medium">{selected.profile.specializations?.join(', ') || '—'}</span></div>
                    {selected.profile.professionalBio && (
                      <div className="col-span-2"><span className="text-gray-400">Bio:</span> <p className="text-gray-700 mt-0.5 text-xs leading-relaxed">{selected.profile.professionalBio}</p></div>
                    )}
                  </div>

                  {/* KYC */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm">KYC Verification</h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">ID Doc Type</span><span className="font-medium">{selected.profile.kycVerification?.idDocType || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">KYC Status</span>
                        <span className={`font-medium ${selected.profile.kycVerification?.verificationStatus === 'VERIFIED' ? 'text-green-600' : 'text-amber-600'}`}>
                          {selected.profile.kycVerification?.verificationStatus || 'NOT SUBMITTED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Verification */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm">Professional Verification</h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{selected.profile.professionalVerification?.verificationType || '—'}</span></div>
                      {selected.profile.professionalVerification?.platformProfileUrl && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Profile URL</span>
                          <a href={selected.profile.professionalVerification.platformProfileUrl} target="_blank" rel="noopener noreferrer"
                            className="text-amber-600 hover:underline flex items-center gap-1 text-xs">
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      <div className="flex justify-between"><span className="text-gray-500">Status</span>
                        <span className={`font-medium ${selected.profile.professionalVerification?.status === 'APPROVED' ? 'text-green-600' : 'text-amber-600'}`}>
                          {selected.profile.professionalVerification?.status || 'NOT SUBMITTED'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm">Uploaded Documents</h3>
                    {selected.profile.documents?.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No documents uploaded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selected.profile.documents?.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-700">{doc.originalName}</p>
                                <p className="text-xs text-gray-400">{doc.documentType} · {(doc.sizeBytes / 1024).toFixed(0)} KB</p>
                              </div>
                            </div>
                            <a href={doc.blobUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-amber-600 hover:underline flex items-center gap-1 font-medium">
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Verification flags */}
                  <div className="flex gap-3 text-xs">
                    {[
                      { label: 'Phone', val: selected.profile.phoneVerified },
                      { label: 'Identity', val: selected.profile.identityVerified },
                      { label: 'Professional', val: selected.profile.professionalVerified },
                      { label: 'Admin', val: selected.profile.adminVerified },
                    ].map(({ label, val }) => (
                      <div key={label} className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium ${val ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        {val ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {label}
                      </div>
                    ))}
                  </div>

                  {/* Reject reason input */}
                  {showReject && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Rejection Reason <span className="text-red-500">*</span></label>
                      <textarea
                        rows={3}
                        placeholder="Explain why this application is being rejected..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3 justify-between">
                  <Button variant="outline" onClick={() => { setSelected(null); setShowReject(false); }}>Close</Button>
                  <div className="flex gap-2">
                    {!showReject ? (
                      <>
                        <Button variant="outline" onClick={() => setShowReject(true)}
                          className="border-red-200 text-red-600 hover:bg-red-50" disabled={actionLoading}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                        <Button onClick={handleApprove} disabled={actionLoading}
                          className="bg-green-600 hover:bg-green-700 text-white">
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          Approve
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => setShowReject(false)} disabled={actionLoading}>Cancel</Button>
                        <Button onClick={handleReject} disabled={actionLoading || !rejectReason.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white">
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                          Confirm Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
