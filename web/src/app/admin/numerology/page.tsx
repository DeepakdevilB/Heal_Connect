'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Edit, Trash2, Plus, FileText } from 'lucide-react'
import { AdminShell, StatCard, StatusBadge, SearchBar, ConfirmDialog, Toast, Pagination } from '@/components/admin-shell'

const mockData = [
  { id: 1, type: 'Life Path', number: '1', title: 'The Leader', status: 'published', lastUpdated: '2023-10-01' },
  { id: 2, type: 'Master Number', number: '11', title: 'The Intuitive', status: 'draft', lastUpdated: '2023-10-02' },
  { id: 3, type: 'Daily Energy', number: '5', title: 'Dynamic Change', status: 'published', lastUpdated: '2023-10-03' },
]

export default function NumerologyPage() {
  const [search, setSearch] = useState('')
  const [data, setData] = useState(mockData)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const handleDelete = () => {
    setData(data.filter(d => d.id !== confirmDelete))
    setConfirmDelete(null)
    setToast({ message: 'Content deleted successfully', type: 'success' })
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Numerology Content</h1>
          <button className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus size={20} />
            Add Content
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Content" value="45" icon={<FileText size={20} />} />
          <StatCard label="Published" value="38" icon={<FileText size={20} />} color="text-green-600" />
          <StatCard label="Drafts" value="7" icon={<FileText size={20} />} color="text-amber-600" />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <SearchBar value={search} onChange={setSearch} placeholder="Search numerology content..." />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Number</th>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Last Updated</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.map(item => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">{item.type}</td>
                    <td className="px-6 py-4 font-semibold text-amber-600">{item.number}</td>
                    <td className="px-6 py-4">{item.title}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-gray-500">{item.lastUpdated}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => setConfirmDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <Pagination page={1} total={data.length} perPage={10} onChange={() => {}} />
          </div>
        </div>
      </div>
      
      <ConfirmDialog 
        open={confirmDelete !== null} 
        title="Delete Content" 
        message="Are you sure you want to delete this numerology content? This action cannot be undone." 
        onConfirm={handleDelete} 
        onCancel={() => setConfirmDelete(null)} 
        danger 
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  )
}
