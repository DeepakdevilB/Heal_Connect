'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, XCircle, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { AdminShell, StatusBadge, SearchBar, ConfirmDialog, Toast, Pagination } from '@/components/admin-shell'

const mockAppointments = [
  { id: 'APT-1001', user: 'Rahul Sharma', provider: 'Dr. Anjali Desai', type: 'Vedic Astrology', date: '2023-10-25', time: '10:00 AM', status: 'pending', amount: '$45' },
  { id: 'APT-1002', user: 'Priya Singh', provider: 'Pandit Sharma', type: 'Kundli Matching', date: '2023-10-25', time: '11:30 AM', status: 'completed', amount: '$60' },
  { id: 'APT-1003', user: 'Amit Patel', provider: 'Yogi Raj', type: 'Numerology', date: '2023-10-26', time: '02:00 PM', status: 'cancelled', amount: '$30' },
]

export default function AppointmentsPage() {
  const [search, setSearch] = useState('')
  const [data, setData] = useState(mockAppointments)
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)

  const handleCancel = () => {
    setData(data.map(d => d.id === confirmCancel ? { ...d, status: 'cancelled' } : d))
    setConfirmCancel(null)
    setToast({ message: 'Appointment cancelled', type: 'success' })
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
            <SearchBar value={search} onChange={setSearch} placeholder="Search appointments..." />
            
            <div className="flex gap-2">
              <select className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input type="date" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Provider</th>
                  <th className="px-6 py-4 font-medium">Service</th>
                  <th className="px-6 py-4 font-medium">Date & Time</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.map(item => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 text-amber-600 font-medium">{item.id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{item.user}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.provider}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.type}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1 text-gray-900 dark:text-white"><CalendarIcon size={14}/> {item.date}</span>
                        <span className="flex items-center gap-1 text-gray-500"><Clock size={14}/> {item.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{item.amount}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        {item.status !== 'cancelled' && item.status !== 'completed' && (
                          <button onClick={() => setConfirmCancel(item.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Cancel">
                            <XCircle size={18} />
                          </button>
                        )}
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
        open={confirmCancel !== null} 
        title="Cancel Appointment" 
        message={`Are you sure you want to cancel appointment ${confirmCancel}?`} 
        onConfirm={handleCancel} 
        onCancel={() => setConfirmCancel(null)} 
        danger 
      />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AdminShell>
  )
}
