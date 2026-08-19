'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { AdminShell, Toast, StatusBadge } from '@/components/admin-shell';

const ADMIN_KEY = 'healconnect-admin-2026';

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<any>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '', content: '', author: '', imageUrl: '', published: false
  });

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blogs', { headers: { 'x-admin-key': ADMIN_KEY } }).then(r => r.json());
      if (res.success) setBlogs(res.data.blogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBlogs(); }, [fetchBlogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBlog ? `/api/admin/blogs/${editingBlog.id}` : '/api/admin/blogs';
    const method = editingBlog ? 'PATCH' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify(formData),
      }).then(r => r.json());
      
      if (res.success) {
        setToast({ message: `Blog ${editingBlog ? 'updated' : 'created'} successfully`, type: 'success' });
        setIsModalOpen(false);
        fetchBlogs();
      }
    } catch (err) {
      setToast({ message: 'Error saving blog', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': ADMIN_KEY }
      }).then(r => r.json());
      if (res.success) {
        setToast({ message: 'Blog deleted', type: 'success' });
        fetchBlogs();
      }
    } catch (err) {
      setToast({ message: 'Error deleting blog', type: 'error' });
    }
  };

  const openModal = (blog: any = null) => {
    setEditingBlog(blog);
    if (blog) {
      setFormData({ title: blog.title, content: blog.content, author: blog.author, imageUrl: blog.imageUrl || '', published: blog.published });
    } else {
      setFormData({ title: '', content: '', author: '', imageUrl: '', published: false });
    }
    setIsModalOpen(true);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blogs</h1>
            <p className="text-gray-500">Manage articles and blog posts</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-amber-600/20">
            <Plus className="w-5 h-5" /> New Blog
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10">
              <tr>
                <th className="text-left px-4 py-3 font-extrabold text-gray-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 font-extrabold text-gray-500 uppercase">Author</th>
                <th className="text-left px-4 py-3 font-extrabold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 font-extrabold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
              ) : blogs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8">No blogs found</td></tr>
              ) : (
                blogs.map(blog => (
                  <tr key={blog.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-bold">{blog.title}</td>
                    <td className="px-4 py-3">{blog.author}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${blog.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {blog.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex justify-end gap-2">
                      <button onClick={() => openModal(blog)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(blog.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-4">{editingBlog ? 'Edit Blog' : 'Create Blog'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Title</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Author</label>
                  <input required type="text" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Image URL</label>
                  <input type="text" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Content (Markdown supported)</label>
                <textarea required rows={10} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} className="w-full p-2 border rounded-xl dark:bg-slate-700 dark:border-slate-600 font-mono text-sm"></textarea>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="published" checked={formData.published} onChange={e => setFormData({...formData, published: e.target.checked})} />
                <label htmlFor="published" className="font-bold cursor-pointer">Published</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold shadow-md">Save Blog</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  );
}
