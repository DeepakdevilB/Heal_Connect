'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Bell, Users, Search } from 'lucide-react'
import { AdminShell, StatCard, StatusBadge, SearchBar, ConfirmDialog, Toast, Pagination } from '@/components/admin-shell'

const mockLogs = [
  { id: 1, title: 'Welcome Offer!', target: 'All Users', sentAt: '2023-10-01 10:00', status: 'sent' },
  { id: 2, title: 'Server Maintenance', target: 'All Astrologers', sentAt: '2023-10-02 12:00', status: 'sent' },
  { id: 3, title: 'Special Discount', target: 'Specific User', sentAt: '2023-10-03 15:30', status: 'failed' },
]

export default function NotificationsPage() {
  const [search, setSearch] = useState('')
  const [target, setTarget] = useState('All Users')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  
  const [logs, setLogs] = useState(mockLogs)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [confirmSend, setConfirmSend] = useState(false)

  const handleSend = () => {
    const newLog = {
      id: Date.now(),
      title: title || 'No Title',
      target,
      sentAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'sent'
    }
    setLogs([newLog, ...logs])
    setTitle('')
    setMessage('')
    setLink('')
    setConfirmSend(false)
    setToast({ message: 'Notification broadcasted successfully', type: 'success' })
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Broadcast Notifications</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compose Message</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
              <select 
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="All Users">All Users</option>
                <option value="All Astrologers">All Astrologers</option>
                <option value="Specific User">Specific User (Testing)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Notification Title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Body</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Type your message here..."
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action Link (Optional)</label>
              <input 
                type="text" 
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="https://..."
              />
            </div>

            <button 
              onClick={() => setConfirmSend(true)}
              disabled={!title || !message}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Send size={20} />
              Send Broadcast
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sent History</h2>
            </div>
            
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <SearchBar value={search} onChange={setSearch} placeholder="Search logs..." />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Title</th>
                    <th className="px-6 py-4 font-medium">Target</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{log.title}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Users size={14} /> {log.target}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{log.sentAt}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={log.status === 'sent' ? 'completed' : 'cancelled'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <Pagination page={1} total={logs.length} perPage={10} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmDialog 
        open={confirmSend} 
        title="Confirm Broadcast" 
        message={`Are you sure you want to send this notification to ${target}?`} 
        onConfirm={handleSend} 
        onCancel={() => setConfirmSend(false)} 
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  )
}
