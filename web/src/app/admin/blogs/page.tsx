'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  X,
  FileEdit,
  EyeOff
} from 'lucide-react';
import { 
  AdminShell, 
  StatCard, 
  StatusBadge, 
  SearchBar, 
  ConfirmDialog, 
  Toast, 
  Pagination 
} from '@/components/admin-shell';

// Mock Data
const MOCK_BLOGS = [
  { id: 'BLG-001', title: 'The Power of Meditation', author: 'Dr. Jane Smith', role: 'Astrologer', category: 'Wellness', date: '2026-07-28', status: 'published', views: 1240, excerpt: 'Discover how meditation can transform your daily life.', content: 'Full content about meditation...' },
  { id: 'BLG-002', title: 'Understanding Your Chart', author: 'Michael Chen', role: 'User', category: 'Astrology', date: '2026-07-29', status: 'pending', views: 0, excerpt: 'A beginner guide to birth charts.', content: 'Full content about birth charts...' },
  { id: 'BLG-003', title: 'Healing Crystals Guide', author: 'Sarah Jones', role: 'Astrologer', category: 'Healing', date: '2026-07-30', status: 'draft', views: 0, excerpt: 'Which crystals work best for anxiety?', content: 'Full content about crystals...' },
  { id: 'BLG-004', title: 'Yoga for Beginners', author: 'Emily White', role: 'User', category: 'Wellness', date: '2026-07-25', status: 'published', views: 890, excerpt: 'Start your yoga journey today.', content: 'Full content about yoga...' },
  { id: 'BLG-005', title: 'Moon Phases Meaning', author: 'Dr. Jane Smith', role: 'Astrologer', category: 'Astrology', date: '2026-07-20', status: 'hidden', views: 450, excerpt: 'How moon phases affect your mood.', content: 'Full content about moon phases...' },
  { id: 'BLG-006', title: 'Ayurvedic Diet Tips', author: 'Raj Patel', role: 'Astrologer', category: 'Diet', date: '2026-07-31', status: 'pending', views: 0, excerpt: 'Eat according to your dosha.', content: 'Full content about ayurveda...' },
  { id: 'BLG-007', title: 'Tarot Card Basics', author: 'Luna Love', role: 'Astrologer', category: 'Tarot', date: '2026-07-15', status: 'published', views: 2100, excerpt: 'Learn the major arcana.', content: 'Full content about tarot...' },
];

const CATEGORIES = ['All', 'Wellness', 'Astrology', 'Healing', 'Diet', 'Tarot'];

export default function BlogManagementPage() {
  const [blogs, setBlogs] = useState(MOCK_BLOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All Blogs');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Dialogs & Modals
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<any>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Stats
  const totalBlogs = blogs.length;
  const publishedBlogs = blogs.filter(b => b.status === 'published').length;
  const pendingBlogs = blogs.filter(b => b.status === 'pending').length;
  const draftBlogs = blogs.filter(b => b.status === 'draft').length;

  // Filtering
  const filteredBlogs = useMemo(() => {
    return blogs.filter(blog => {
      const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            blog.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = 
        activeTab === 'All Blogs' ? true :
        activeTab === 'Pending Approval' ? blog.status === 'pending' :
        activeTab === 'Published' ? blog.status === 'published' :
        activeTab === 'Drafts' ? blog.status === 'draft' : true;

      const matchesCategory = categoryFilter === 'All' || blog.category === categoryFilter;

      return matchesSearch && matchesTab && matchesCategory;
    });
  }, [blogs, searchQuery, activeTab, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
  const paginatedBlogs = filteredBlogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleDeleteClick = (id: string) => {
    setBlogToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (blogToDelete) {
      setBlogs(blogs.filter(b => b.id !== blogToDelete));
      setToast({ message: 'Blog post deleted successfully', type: 'success' });
    }
    setDeleteConfirmOpen(false);
    setBlogToDelete(null);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    setBlogs(blogs.map(b => b.id === id ? { ...b, status: newStatus } : b));
    setToast({ message: `Blog status updated to ${newStatus}`, type: 'success' });
  };

  const openEditModal = (blog: any = null) => {
    if (blog) {
      setCurrentBlog({ ...blog });
    } else {
      setCurrentBlog({
        id: `BLG-00${blogs.length + 1}`,
        title: '',
        author: '',
        role: 'Astrologer',
        category: 'Wellness',
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        views: 0,
        excerpt: '',
        content: ''
      });
    }
    setIsEditModalOpen(true);
  };

  const saveBlog = () => {
    if (blogs.find(b => b.id === currentBlog.id)) {
      setBlogs(blogs.map(b => b.id === currentBlog.id ? currentBlog : b));
      setToast({ message: 'Blog post updated successfully', type: 'success' });
    } else {
      setBlogs([currentBlog, ...blogs]);
      setToast({ message: 'Blog post created successfully', type: 'success' });
    }
    setIsEditModalOpen(false);
  };

  const openViewModal = (blog: any) => {
    setCurrentBlog(blog);
    setIsViewModalOpen(true);
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Management</h1>
          <button 
            onClick={() => openEditModal()}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span>Add Blog Post</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Blogs" value={totalBlogs} icon={FileText} color="blue" />
          <StatCard label="Published" value={publishedBlogs} icon={CheckCircle} color="green" />
          <StatCard label="Pending Approval" value={pendingBlogs} icon={Clock} color="amber" />
          <StatCard label="Drafts" value={draftBlogs} icon={FileEdit} color="purple" />
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {['All Blogs', 'Pending Approval', 'Published', 'Drafts'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative ${
                activeTab === tab 
                  ? 'text-amber-600 dark:text-amber-500' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTab" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 dark:bg-amber-500" 
                />
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="w-full sm:w-96">
            <SearchBar 
              value={searchQuery} 
              onChange={(v) => { setSearchQuery(v); setCurrentPage(1); }} 
              placeholder="Search by title or author..." 
            />
          </div>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Blog info</th>
                  <th className="px-6 py-4 font-medium">Author</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Stats</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedBlogs.length > 0 ? (
                  paginatedBlogs.map((blog) => (
                    <motion.tr 
                      key={blog.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{blog.title}</div>
                        <div className="text-xs text-gray-500">{blog.id} • {blog.date}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white">{blog.author}</div>
                        <div className="text-xs text-gray-500">{blog.role}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {blog.category}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={blog.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {blog.views.toLocaleString()} views
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openViewModal(blog)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          
                          {blog.status === 'pending' && (
                            <button 
                              onClick={() => handleStatusChange(blog.id, 'published')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                              title="Approve & Publish"
                            >
                              <CheckCircle size={18} />
                            </button>
                          )}
                          
                          {blog.status === 'published' && (
                            <button 
                              onClick={() => handleStatusChange(blog.id, 'hidden')}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20 rounded-md transition-colors"
                              title="Unpublish"
                            >
                              <EyeOff size={18} />
                            </button>
                          )}

                          <button 
                            onClick={() => openEditModal(blog)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          
                          <button 
                            onClick={() => handleDeleteClick(blog.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No blogs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination 
                page={currentPage} 
                total={filteredBlogs.length} 
                perPage={itemsPerPage} 
                onChange={setCurrentPage} 
              />
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {isViewModalOpen && currentBlog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">View Blog Post</h3>
                <button onClick={() => setIsViewModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentBlog.title}</h2>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <span>By {currentBlog.author}</span>
                    <span>•</span>
                    <span>{currentBlog.date}</span>
                    <span>•</span>
                    <StatusBadge status={currentBlog.status} />
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <p className="font-medium text-gray-700 dark:text-gray-300 italic">{currentBlog.excerpt}</p>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{currentBlog.content}</p>
                </div>
              </div>
              <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isEditModalOpen && currentBlog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentBlog.id.startsWith('BLG') && blogs.find(b => b.id === currentBlog.id) ? 'Edit Blog Post' : 'Create Blog Post'}
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input 
                      type="text" 
                      value={currentBlog.title}
                      onChange={(e) => setCurrentBlog({...currentBlog, title: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author</label>
                    <input 
                      type="text" 
                      value={currentBlog.author}
                      onChange={(e) => setCurrentBlog({...currentBlog, author: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      value={currentBlog.category}
                      onChange={(e) => setCurrentBlog({...currentBlog, category: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select
                      value={currentBlog.status}
                      onChange={(e) => setCurrentBlog({...currentBlog, status: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="published">Published</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Excerpt</label>
                  <textarea 
                    value={currentBlog.excerpt}
                    onChange={(e) => setCurrentBlog({...currentBlog, excerpt: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                  <textarea 
                    value={currentBlog.content}
                    onChange={(e) => setCurrentBlog({...currentBlog, content: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveBlog}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Save Post
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Dialog */}
      <ConfirmDialog 
        open={deleteConfirmOpen}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setBlogToDelete(null);
        }}
        danger
      />

      {/* Toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </AdminShell>
  );
}
