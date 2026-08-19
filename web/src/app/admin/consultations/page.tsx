'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, Video, MessageSquare, Phone } from 'lucide-react'
import { AdminShell, StatusBadge, SearchBar, Pagination } from '@/components/admin-shell'

const mockConsultations = [
  { id: 'CON-5001', user: 'Neha Gupta', provider: 'Astro Suresh', type: 'video', duration: '30m', date: '2023-10-24 14:00', status: 'completed', amount: '$50', rating: 5 },
  { id: 'CON-5002', user: 'Vikram Singh', provider: 'Tarot Priya', type: 'chat', duration: '15m', date: '2023-10-24 16:30', status: 'completed', amount: '$20', rating: 4 },
  { id: 'CON-5003', user: 'Rohan Sharma', provider: 'Dr. Anjali Desai', type: 'call', duration: '45m', date: '2023-10-24 18:00', status: 'completed', amount: '$75', rating: 5 },
  { id: 'CON-5004', user: 'Sneha Patel', provider: 'Pandit Ji', type: 'video', duration: '0m', date: '2023-10-25 09:00', status: 'pending', amount: '$50', rating: null },
]

const TypeIcon = ({ type }: { type: string }) => {
  switch(type) {
    case 'video': return <Video size={16} className="text-blue-500" />
    case 'chat': return <MessageSquare size={16} className="text-green-500" />
    case 'call': return <Phone size={16} className="text-purple-500" />
    default: return null
  }
}

export default function ConsultationsPage() {
  const [search, setSearch] = useState('')
  const [data] = useState(mockConsultations)

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Consultation Logs</h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <SearchBar value={search} onChange={setSearch} placeholder="Search user or provider..." />
            
            <select className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none">
              <option value="">All Types</option>
              <option value="video">Video Call</option>
              <option value="chat">Chat</option>
              <option value="call">Audio Call</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">ID / Type</th>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Provider</th>
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Rating</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.map(item => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <TypeIcon type={item.type} />
                        <span className="font-medium text-amber-600">{item.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{item.user}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.provider}</td>
                    <td className="px-6 py-4 text-gray-500">{item.date}</td>
                    <td className="px-6 py-4 font-medium">{item.duration}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4">
                      {item.rating ? (
                        <div className="flex items-center text-amber-500">
                          <span className="font-medium mr-1">{item.rating}</span>
                          <span className="text-sm">⭐</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View Transcript/Details">
                          <Eye size={18} />
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
    </AdminShell>
  )
}
