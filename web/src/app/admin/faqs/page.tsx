'use client';

import { useState, useEffect, useCallback } from 'react';
import { HelpCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { AdminShell, Toast } from '@/components/admin-shell';

const ADMIN_KEY = 'healconnect-admin-2026';

export default function AdminFaqsPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    question: '', answer: '', category: ''
  });

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/faqs', { headers: { 'x-admin-key': ADMIN_KEY } }).then(r => r.json());
      if (res.success) setFaqs(res.data.faqs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingFaq ? `/api/admin/faqs/${editingFaq.id}` : '/api/admin/faqs';
    const method = editingFaq ? 'PATCH' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify(formData),
      }).then(r => r.json());
      
      if (res.success) {
        setToast({ message: `FAQ ${editingFaq ? 'updated' : 'created'} successfully`, type: 'success' });
        setIsModalOpen(false);
        fetchFaqs();
      }
    } catch (err) {
      setToast({ message: 'Error saving FAQ', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ?')) return;
    try {
      const res = await fetch(`/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': ADMIN_KEY }
      }).then(r => r.json());
      if (res.success) {
        setToast({ message: 'FAQ deleted', type: 'success' });
        fetchFaqs();
      }
    } catch (err) {
      setToast({ message: 'Error deleting FAQ', type: 'error' });
    }
  };

  const openModal = (faq: any = null) => {
    setEditingFaq(faq);
    if (faq) {
      setFormData({ question: faq.question, answer: faq.answer, category: faq.category });
    } else {
      setFormData({ question: '', answer: '', category: 'General' });
    }
    setIsModalOpen(true);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FAQs</h1>
            <p className="text-gray-500">Manage Frequently Asked Questions</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-amber-600/20">
            <Plus className="w-5 h-5" /> New FAQ
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="text-left px-4 py-3 font-extrabold text-gray-500 uppercase">Question</th>
                <th className="text-left px-4 py-3 font-extrabold text-gray-500 uppercase">Category</th>
                <th className="text-right px-4 py-3 font-extrabold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8">Loading...</td></tr>
              ) : faqs.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8">No FAQs found</td></tr>
              ) : (
                faqs.map(faq => (
                  <tr key={faq.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-bold max-w-md truncate">{faq.question}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        {faq.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex justify-end gap-2">
                      <button onClick={() => openModal(faq)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(faq.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">{editingFaq ? 'Edit FAQ' : 'Create FAQ'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Question</label>
                <input required type="text" value={formData.question} onChange={e => setFormData({...formData, question: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600">
                  <option value="General">General</option>
                  <option value="Billing">Billing</option>
                  <option value="Technical">Technical</option>
                  <option value="Practitioners">Practitioners</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Answer</label>
                <textarea required rows={5} value={formData.answer} onChange={e => setFormData({...formData, answer: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-sans text-sm"></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold shadow-md">Save FAQ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  );
}
