'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  AdminShell, 
  StatusBadge, 
  SearchBar, 
  ConfirmDialog, 
  Toast, 
  Pagination 
} from '@/components/admin-shell';
import { 
  Mail,
  Trash2,
  CheckCircle,
  Clock,
  Send,
  X
} from 'lucide-react';

const ADMIN_KEY = 'healconnect-admin-2026';

export default function AdminMessagesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [messages, setMessages] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; messageId: string | null; action: 'resolve' | 'delete' | null }>({ open: false, messageId: null, action: null });

  const fetchMessages = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages?status=${statusFilter}`, {
        headers: { 'x-admin-key': ADMIN_KEY },
      }).then(r => r.json());
      if (res.success && res.data) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const perPage = 10;

  const filteredMessages = messages.filter(msg => {
    const matchesSearch = msg.name.toLowerCase().includes(search.toLowerCase()) || 
                          msg.email.toLowerCase().includes(search.toLowerCase()) ||
                          msg.subject.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMessages.length / perPage);
  const paginatedMessages = filteredMessages.slice((page - 1) * perPage, page * perPage);

  const handleAction = (messageId: string, action: 'resolve' | 'delete') => {
    setConfirmDialog({ open: true, messageId, action });
  };

  const confirmAction = async () => {
    const { messageId, action } = confirmDialog;
    if (!messageId || !action) return;

    try {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/messages/${messageId}`, {
          method: 'DELETE',
          headers: { 'x-admin-key': ADMIN_KEY },
        }).then(r => r.json());
        
        if (res.success) {
          setMessages(messages.filter(m => m.id !== messageId));
          setToast({ message: 'Message deleted successfully', type: 'success' });
          if (selectedMessage?.id === messageId) setSelectedMessage(null);
        }
      } else if (action === 'resolve') {
        const res = await fetch(`/api/admin/messages/${messageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
          body: JSON.stringify({ status: 'resolved' }),
        }).then(r => r.json());

        if (res.success) {
          setMessages(messages.map(m => m.id === messageId ? { ...m, status: 'resolved' } : m));
          setToast({ message: 'Message marked as resolved', type: 'success' });
          if (selectedMessage?.id === messageId) {
            setSelectedMessage({ ...selectedMessage, status: 'resolved' });
          }
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'An error occurred', type: 'error' });
    }

    setConfirmDialog({ open: false, messageId: null, action: null });
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    
    // In a real app, you would also send an email here via a backend route
    try {
      const res = await fetch(`/api/admin/messages/${selectedMessage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
        body: JSON.stringify({ status: 'replied' }),
      }).then(r => r.json());

      if (res.success) {
        setMessages(messages.map(m => m.id === selectedMessage.id ? { ...m, status: 'replied' } : m));
        setSelectedMessage({ ...selectedMessage, status: 'replied' });
        setReplyText('');
        setToast({ message: 'Reply sent successfully', type: 'success' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to send reply', type: 'error' });
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Messages</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and reply to user inquiries</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Messages List */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchBar value={search} onChange={setSearch} placeholder="Search messages..." />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full sm:w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="replied">Replied</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Loading messages...</div>
                ) : paginatedMessages.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No messages found.
                  </div>
                ) : (
                  paginatedMessages.map((msg) => (
                    <div 
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors ${selectedMessage?.id === msg.id ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-medium ${msg.status === 'new' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {msg.name}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 font-medium mb-1 truncate">
                        {msg.subject}
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[70%]">
                          {msg.message}
                        </span>
                        <StatusBadge status={msg.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <Pagination page={page} total={totalPages} perPage={perPage} onChange={setPage} />
            </div>
          </div>

          {/* Message Detail & Reply */}
          <div className="flex-1 lg:max-w-md xl:max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
            {selectedMessage ? (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-gray-400" />
                    Message Details
                  </h3>
                  <div className="flex gap-2">
                    {selectedMessage.status !== 'resolved' && (
                      <button 
                        onClick={() => handleAction(selectedMessage.id, 'resolve')}
                        className="p-1.5 text-gray-500 hover:text-green-600 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20"
                        title="Mark Resolved"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleAction(selectedMessage.id, 'delete')}
                      className="p-1.5 text-gray-500 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete Message"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => setSelectedMessage(null)}
                      className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-md lg:hidden"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedMessage.subject}</h2>
                        <div className="text-sm font-medium text-gray-900 dark:text-white mt-2">{selectedMessage.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{selectedMessage.email}</div>
                      </div>
                      <StatusBadge status={selectedMessage.status} />
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {selectedMessage.message}
                    </div>
                  </div>
                  
                  {selectedMessage.status === 'replied' && (
                    <div className="border-l-4 border-amber-500 pl-4 py-1">
                      <div className="text-xs font-medium text-amber-600 dark:text-amber-500 mb-1">Replied by Support</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Response has been sent to user's email.</div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reply to user</label>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 dark:bg-gray-700 dark:text-white resize-none mb-3"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8">
                <Mail className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a message from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.action === 'delete' ? 'Delete Message' : 'Resolve Message'}
        message={
          confirmDialog.action === 'delete' 
            ? 'Are you sure you want to delete this message? This action cannot be undone.' 
            : 'Are you sure you want to mark this message as resolved?'
        }
        danger={confirmDialog.action === 'delete'}
        onConfirm={confirmAction}
        onCancel={() => setConfirmDialog({ open: false, messageId: null, action: null })}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </AdminShell>
  );
}
