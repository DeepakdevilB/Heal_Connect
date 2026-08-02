'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AdminShell, 
  StatusBadge, 
  ConfirmDialog, 
  Toast
} from '@/components/admin-shell';
import { 
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Power
} from 'lucide-react';

const MOCK_BANNERS = [
  { id: '1', title: 'Summer Solstice Offer', imageUrl: 'https://via.placeholder.com/800x400/f59e0b/ffffff?text=Summer+Solstice', link: '/offers/summer', status: 'active', order: 1 },
  { id: '2', title: 'New Astrologer Joined', imageUrl: 'https://via.placeholder.com/800x400/3b82f6/ffffff?text=New+Astrologer', link: '/astrologers', status: 'active', order: 2 },
  { id: '3', title: 'Tarot Reading Discount', imageUrl: 'https://via.placeholder.com/800x400/8b5cf6/ffffff?text=Tarot+Discount', link: '/services/tarot', status: 'inactive', order: 3 },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState(MOCK_BANNERS);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({ title: '', imageUrl: '', link: '', status: 'active' });

  const handleSave = () => {
    if (editingBanner) {
      setBanners(banners.map(b => b.id === editingBanner.id ? { ...b, ...formData } : b));
      setToast({ message: 'Banner updated successfully', type: 'success' });
    } else {
      setBanners([...banners, { id: Math.random().toString(), ...formData, order: banners.length + 1 }]);
      setToast({ message: 'Banner added successfully', type: 'success' });
    }
    setIsModalOpen(false);
    setEditingBanner(null);
    setFormData({ title: '', imageUrl: '', link: '', status: 'active' });
  };

  const openEditModal = (banner: any) => {
    setEditingBanner(banner);
    setFormData({ title: banner.title, imageUrl: banner.imageUrl, link: banner.link, status: banner.status });
    setIsModalOpen(true);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      setBanners(banners.filter(b => b.id !== confirmDelete));
      setToast({ message: 'Banner deleted successfully', type: 'success' });
      setConfirmDelete(null);
    }
  };

  const toggleStatus = (id: string) => {
    setBanners(banners.map(b => {
      if (b.id === id) {
        return { ...b, status: b.status === 'active' ? 'inactive' : 'active' };
      }
      return b;
    }));
    setToast({ message: 'Banner status updated', type: 'success' });
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banners Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage homepage hero banners and promotions</p>
          </div>
          <button 
            onClick={() => {
              setEditingBanner(null);
              setFormData({ title: '', imageUrl: '', link: '', status: 'active' });
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Banner
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <motion.div 
              key={banner.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            >
              <div className="h-40 w-full relative bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <StatusBadge status={banner.status} />
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{banner.title}</h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 mt-auto">
                  <LinkIcon className="h-4 w-4 mr-1" />
                  <span className="truncate">{banner.link}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button 
                    onClick={() => toggleStatus(banner.id)}
                    className={`flex items-center text-sm font-medium ${banner.status === 'active' ? 'text-amber-600 hover:text-amber-700' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    {banner.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditModal(banner)} className="p-2 text-gray-400 hover:text-amber-600 rounded bg-gray-50 dark:bg-gray-700/50 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(banner.id)} className="p-2 text-gray-400 hover:text-red-600 rounded bg-gray-50 dark:bg-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
                {editingBanner ? 'Edit Banner' : 'Add New Banner'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banner Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Summer Special Offer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ImageIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Link</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                    placeholder="/offers/summer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                disabled={!formData.title || !formData.imageUrl || !formData.link}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg disabled:opacity-50 transition-colors"
              >
                Save Banner
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Banner"
        message="Are you sure you want to delete this banner? It will be removed immediately."
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
