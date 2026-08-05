'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AdminShell, 
  SearchBar, 
  ConfirmDialog, 
  Toast
} from '@/components/admin-shell';
import { 
  Plus,
  Edit2,
  Trash2,
  GripVertical
} from 'lucide-react';

const MOCK_FAQS = [
  { id: '1', category: 'Vedic Astrology', question: 'What is Vedic Astrology?', answer: 'Vedic Astrology, also known as Jyotish, is the traditional Hindu system of astrology.' },
  { id: '2', category: 'Kundli', question: 'How is a Kundli generated?', answer: 'A Kundli is generated using your exact date, time, and place of birth.' },
  { id: '3', category: 'Tarot', question: 'Can Tarot predict the future?', answer: 'Tarot cards provide guidance and insight into past, present, and potential future events based on your current path.' },
  { id: '4', category: 'Consultations', question: 'How long is a consultation?', answer: 'Consultations typically last between 30 to 60 minutes depending on the service selected.' },
  { id: '5', category: 'Payments', question: 'What payment methods do you accept?', answer: 'We accept credit/debit cards, UPI, and popular digital wallets.' },
];

const CATEGORIES = ['All', 'Vedic Astrology', 'Kundli', 'Tarot', 'Consultations', 'Payments'];

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState(MOCK_FAQS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({ category: 'Vedic Astrology', question: '', answer: '' });

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(search.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSave = () => {
    if (editingFaq) {
      setFaqs(faqs.map(f => f.id === editingFaq.id ? { ...f, ...formData } : f));
      setToast({ message: 'FAQ updated successfully', type: 'success' });
    } else {
      setFaqs([...faqs, { id: Math.random().toString(), ...formData }]);
      setToast({ message: 'FAQ added successfully', type: 'success' });
    }
    setIsModalOpen(false);
    setEditingFaq(null);
    setFormData({ category: 'Vedic Astrology', question: '', answer: '' });
  };

  const openEditModal = (faq: any) => {
    setEditingFaq(faq);
    setFormData({ category: faq.category, question: faq.question, answer: faq.answer });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      setFaqs(faqs.filter(f => f.id !== confirmDelete));
      setToast({ message: 'FAQ deleted successfully', type: 'success' });
      setConfirmDelete(null);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FAQ Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage Frequently Asked Questions</p>
          </div>
          <button 
            onClick={() => {
              setEditingFaq(null);
              setFormData({ category: 'Vedic Astrology', question: '', answer: '' });
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add FAQ
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} placeholder="Search FAQs..." />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((faq) => (
              <motion.div 
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="cursor-move text-gray-400 mt-1 mr-3">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500">
                      {faq.category}
                    </span>
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">{faq.question}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => openEditModal(faq)} className="p-1 text-gray-400 hover:text-amber-600 rounded">
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button onClick={() => setConfirmDelete(faq.id)} className="p-1 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
            ))}
            
            {filteredFaqs.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No FAQs found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., What is Vedic Astrology?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Answer</label>
                <textarea
                  rows={4}
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Provide the answer here..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.question || !formData.answer}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AdminShell>
  );
}
