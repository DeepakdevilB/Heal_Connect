'use client';

import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Plus, Edit, Trash2 } from 'lucide-react';
import { AdminShell, Toast } from '@/components/admin-shell';


export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '', imageUrl: '', linkUrl: '', isActive: true
  });

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/banners', { headers: {} }).then(r => r.json());
      if (res.success) setBanners(res.data.banners);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners';
    const method = editingBanner ? 'PATCH' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).then(r => r.json());
      
      if (res.success) {
        setToast({ message: `Banner ${editingBanner ? 'updated' : 'created'} successfully`, type: 'success' });
        setIsModalOpen(false);
        fetchBanners();
      }
    } catch (err) {
      setToast({ message: 'Error saving banner', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: 'DELETE',
        headers: {}
      }).then(r => r.json());
      if (res.success) {
        setToast({ message: 'Banner deleted', type: 'success' });
        fetchBanners();
      }
    } catch (err) {
      setToast({ message: 'Error deleting banner', type: 'error' });
    }
  };

  const openModal = (banner: any = null) => {
    setEditingBanner(banner);
    if (banner) {
      setFormData({ title: banner.title, imageUrl: banner.imageUrl, linkUrl: banner.linkUrl || '', isActive: banner.isActive });
    } else {
      setFormData({ title: '', imageUrl: '', linkUrl: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banners</h1>
            <p className="text-gray-500">Manage promotional banners on the platform</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-amber-600/20">
            <Plus className="w-5 h-5" /> New Banner
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8 text-gray-500">Loading banners...</div>
          ) : banners.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">No banners found</div>
          ) : (
            banners.map(banner => (
              <div key={banner.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
                <div className="h-40 bg-gray-100 dark:bg-slate-700 relative overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm ${banner.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1 truncate">{banner.title}</h3>
                  <p className="text-xs text-blue-500 truncate mb-4">{banner.linkUrl || 'No link'}</p>
                  
                  <div className="mt-auto flex gap-2 pt-4 border-t border-gray-100 dark:border-white/10">
                    <button onClick={() => openModal(banner)} className="flex-1 flex justify-center items-center gap-2 p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl font-bold transition-colors hover:bg-blue-100">
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="flex-1 flex justify-center items-center gap-2 p-2 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl font-bold transition-colors hover:bg-red-100">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">{editingBanner ? 'Edit Banner' : 'Create Banner'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Internal Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Image URL</label>
                <input required type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" placeholder="https://example.com/image.jpg" />
                {formData.imageUrl && (
                  <div className="mt-2 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Link URL (Optional)</label>
                <input type="text" value={formData.linkUrl} onChange={e => setFormData({...formData, linkUrl: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" placeholder="https://example.com/promo" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                <label htmlFor="isActive" className="font-bold cursor-pointer">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold shadow-md">Save Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  );
}
