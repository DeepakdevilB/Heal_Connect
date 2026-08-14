'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokenStore, sessionsApi } from '@/lib/api';

interface TimeProposal {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface SessionRequest {
  id: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    photoUrl: string | null;
  };
  timeProposals: TimeProposal[];
}

const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const valueHour = hour.toString().padStart(2, '0');
  return {
    value: `${valueHour}:${min}`,
    label: `${displayHour.toString().padStart(2, '0')}:${min} ${ampm}`
  };
});

export default function ExpertRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState<string | null>(null);
  
  // State for the slot builder
  const [activeReqId, setActiveReqId] = useState<string | null>(null);
  const [slots, setSlots] = useState<{ date: string; time: string }[]>([{ date: '', time: '' }]);

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchRequests = async () => {
      try {
        const res = await sessionsApi.getRequests(token);
        if (res.success && res.data) {
          setRequests(res.data.sessions || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [router]);

  const handleProposeTimes = async (sessionId: string) => {
    const token = tokenStore.getAccess();
    if (!token) return;

    // Validate slots
    const validSlots = slots.filter(s => s.date && s.time);
    if (validSlots.length === 0) {
      toast.error('Please add at least one valid time slot.');
      return;
    }

    setProposing(sessionId);
    try {
      const res = await sessionsApi.proposeTimes(token, sessionId, validSlots.map(s => {
        const start = new Date(`${s.date}T${s.time}`);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour session
        return {
          startTime: start.toISOString(),
          endTime: end.toISOString()
        };
      }));

      if (res.success) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-gray-900">Time slots proposed successfully!</span>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => { toast.dismiss(t.id); router.push('/expert/dashboard'); }}
                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Stay Here
              </button>
            </div>
          </div>
        ), { duration: 8000 });
        setRequests(requests.filter(r => r.id !== sessionId)); // Remove from pending list
        setActiveReqId(null);
        setSlots([{ date: '', time: '' }]);
      } else {
        toast.error(res.message || 'Failed to propose times.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setProposing(null);
    }
  };

  const updateSlot = (index: number, field: 'date' | 'time', value: string) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    setSlots([...slots, { date: '', time: '' }]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffbf0] p-6 lg:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Calendar className="h-8 w-8 text-amber-500" />
          Client Session Requests
        </h1>

        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-yellow-100">
            <p className="text-gray-500">You have no pending session requests.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.map((req) => (
              <Card key={req.id} className="border border-yellow-200/60 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-amber-50/50 pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-3">
                      {req.user.photoUrl ? (
                        <img src={req.user.photoUrl} alt="User" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center font-bold text-amber-700">
                          {req.user.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        Request from <span className="text-amber-600">{req.user.name || 'User'}</span>
                        <div className="text-sm font-normal text-gray-500 mt-0.5">
                          Received on {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {req.status === 'PENDING' && (
                        <span className="text-xs font-bold px-3 py-1 bg-rose-100 text-rose-700 rounded-full">ACTION REQUIRED</span>
                      )}
                      {req.status === 'TIME_PROPOSED' && (
                        <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded-full">WAITING FOR CLIENT</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {req.status === 'TIME_PROPOSED' ? (
                    <div className="text-gray-600">
                      You have suggested times for this session. Waiting for {req.user.name || 'the client'} to select one.
                    </div>
                  ) : activeReqId !== req.id ? (
                    <Button 
                      onClick={() => { setActiveReqId(req.id); setSlots([{ date: '', time: '' }]); }}
                      className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-6"
                    >
                      Suggest Available Times
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-gray-700">Add Date & Time Slots</label>
                        {slots.map((slot, index) => (
                          <div key={index} className="flex flex-col sm:flex-row gap-3 items-center">
                            <div className="flex-1 w-full sm:w-1/2">
                              <span className="text-xs text-gray-500 mb-1 block">Date</span>
                              <input 
                                type="date" 
                                value={slot.date} 
                                onChange={(e) => updateSlot(index, 'date', e.target.value)}
                                className="w-full border-gray-300 rounded-lg p-2.5 text-sm focus:ring-amber-500 focus:border-amber-500"
                              />
                            </div>
                            <div className="flex-1 w-full sm:w-1/2">
                              <span className="text-xs text-gray-500 mb-1 block">Time</span>
                              <select 
                                value={slot.time} 
                                onChange={(e) => updateSlot(index, 'time', e.target.value)}
                                className="w-full border-gray-300 rounded-lg p-2.5 text-sm focus:ring-amber-500 focus:border-amber-500 bg-white"
                              >
                                <option value="" disabled>Select Time</option>
                                {TIME_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            {slots.length > 1 && (
                              <div className="mt-5 sm:mt-6">
                                <Button variant="ghost" size="icon" onClick={() => removeSlot(index)} className="text-red-500 hover:bg-red-50 rounded-full">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <Button variant="outline" size="sm" onClick={addSlot} className="text-amber-600 border-amber-200 hover:bg-amber-50">
                          <Plus className="w-4 h-4 mr-1" /> Add Another Slot
                        </Button>
                        <div className="space-x-3">
                          <Button variant="ghost" onClick={() => setActiveReqId(null)}>Cancel</Button>
                          <Button 
                            onClick={() => handleProposeTimes(req.id)}
                            disabled={proposing === req.id}
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                          >
                            {proposing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Time Options'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
