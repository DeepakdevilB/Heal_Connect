'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokenStore, sessionsApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

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
  practitioner: {
    name: string;
    photoUrl: string | null;
  };
  timeProposals: TimeProposal[];
}

export default function UserRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchRequests = async () => {
      try {
        const res = await sessionsApi.getRequests(token);
        if (res.success) {
          setRequests(res.data.sessions);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [router]);

  const handleSelectTime = async (sessionId: string, proposalId: string) => {
    const token = tokenStore.getAccess();
    if (!token) return;

    setSelecting(proposalId);
    try {
      const res = await sessionsApi.selectTime(token, sessionId, proposalId);

      if (res.success) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-gray-900">Time confirmed successfully!</span>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => { toast.dismiss(t.id); router.push('/dashboard'); }}
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
      } else {
        toast.error(res.message || 'Failed to confirm time. It may no longer be available.');
        // Refresh to get latest state
        window.location.reload();
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setSelecting(null);
    }
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
          Session Requests
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
                      {req.practitioner.photoUrl ? (
                        <img src={req.practitioner.photoUrl} alt="Practitioner" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center font-bold text-amber-700">
                          {req.practitioner.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        Request with <span className="text-amber-600">{req.practitioner.name}</span>
                        <div className="text-sm font-normal text-gray-500 mt-0.5">
                          Requested on {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {req.status === 'PENDING' && (
                        <span className="text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">WAITING FOR EXPERT</span>
                      )}
                      {req.status === 'TIME_PROPOSED' && (
                        <span className="text-xs font-bold px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> EXPERT REPLIED
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {req.status === 'PENDING' ? (
                    <p className="text-gray-600">The expert has been notified and will suggest available times soon.</p>
                  ) : req.status === 'TIME_PROPOSED' ? (
                    <div className="space-y-4">
                      <p className="font-semibold text-gray-800">Please choose one of the following proposed times:</p>
                      <div className="flex flex-col gap-3">
                        {req.timeProposals.filter(p => p.status === 'PENDING').map(proposal => {
                          const start = new Date(proposal.startTime);
                          const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                          return (
                            <div key={proposal.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-amber-300 transition-colors">
                              <span className="font-medium text-gray-800">{formatter.format(start)}</span>
                              <Button 
                                onClick={() => handleSelectTime(req.id, proposal.id)}
                                disabled={selecting !== null}
                                className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-6"
                              >
                                {selecting === proposal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Time'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
