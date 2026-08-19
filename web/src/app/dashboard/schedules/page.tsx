'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar, CheckCircle2, Clock, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tokenStore, sessionsApi } from '@/lib/api';
import { getPractitionerAvatar } from '@/lib/utils';

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
  scheduledStartTime?: string;
  practitioner: {
    name: string;
    photoUrl: string | null;
  };
  timeProposals: TimeProposal[];
}

export default function UserSchedulesPage() {
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

  const handleSelectTime = async (sessionId: string, proposalId: string) => {
    const token = tokenStore.getAccess();
    if (!token) return;

    setSelecting(proposalId);
    try {
      const res = await sessionsApi.selectTime(token, sessionId, proposalId);

      if (res.success) {
        toast.success('Time slot selected! Your session is now confirmed.');
        // Update local state
        setRequests(prev => prev.map(req => {
          if (req.id === sessionId) {
            const selectedProposal = req.timeProposals.find(p => p.id === proposalId);
            return {
              ...req,
              status: 'CONFIRMED',
              scheduledStartTime: selectedProposal?.startTime,
              timeProposals: req.timeProposals.map(p => 
                p.id === proposalId ? { ...p, status: 'SELECTED' } : { ...p, status: 'CANCELLED' }
              )
            };
          }
          return req;
        }));
      } else {
        toast.error(res.message || 'Failed to select time slot.');
      }
    } catch {
      toast.error('Network error while selecting time.');
    } finally {
      setSelecting(null);
    }
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(isoString));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Sessions</h1>
          <p className="text-gray-500 mt-1">Manage your upcoming consultation sessions.</p>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Scheduled Sessions</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You haven't requested any sessions yet. Browse our list of expert practitioners to book a consultation.
            </p>
            <Button onClick={() => router.push('/practitioners')} className="bg-amber-500 hover:bg-amber-600">
              Browse Experts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {requests.map(req => {
            const isPending = req.status === 'PENDING';
            const isProposed = req.status === 'TIME_PROPOSED';
            const isConfirmed = req.status === 'CONFIRMED';
            
            return (
              <Card key={req.id} className="overflow-hidden shadow-sm">
                <CardHeader className={`border-b pb-4 ${isConfirmed ? 'bg-green-50/50' : 'bg-amber-50/50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-white shadow-sm">
                        <img 
                          src={getPractitionerAvatar(req.practitioner.photoUrl, req.practitioner.name)} 
                          alt={req.practitioner.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">Session with {req.practitioner.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPending ? 'bg-amber-100 text-amber-700' :
                            isProposed ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {isPending && <Clock className="w-3.5 h-3.5" />}
                            {isProposed && <Calendar className="w-3.5 h-3.5" />}
                            {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isPending && 'Waiting for Expert'}
                            {isProposed && 'Action Required'}
                            {isConfirmed && 'Confirmed'}
                          </span>
                          <span className="text-xs text-gray-400">
                            Requested {formatDate(req.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {isPending && (
                    <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                      <h4 className="font-bold text-gray-800 mb-1">Waiting for proposed times</h4>
                      <p className="text-sm text-gray-500 max-w-sm mx-auto">
                        {req.practitioner.name} has received your request and will propose available time slots shortly. We'll notify you when times are available.
                      </p>
                    </div>
                  )}

                  {isProposed && (
                    <div>
                      <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        Please select a convenient time:
                      </h4>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {req.timeProposals.filter(p => p.status === 'PENDING').map(proposal => (
                          <div key={proposal.id} className="border rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all bg-white relative group">
                            <p className="font-semibold text-gray-900 mb-3">{formatDate(proposal.startTime)}</p>
                            <Button 
                              onClick={() => handleSelectTime(req.id, proposal.id)}
                              disabled={selecting !== null}
                              variant="outline"
                              className="w-full group-hover:bg-amber-50 group-hover:text-amber-700 group-hover:border-amber-300"
                            >
                              {selecting === proposal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm This Time'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isConfirmed && (
                    <div className="bg-green-50 rounded-xl p-6 border border-green-100 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <Check className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="font-bold text-gray-900 text-lg mb-1">Session Scheduled</h4>
                      <p className="text-gray-600 mb-2">
                        Your session with {req.practitioner.name} is confirmed for:
                      </p>
                      <p className="font-bold text-green-700 text-xl">
                        {req.scheduledStartTime ? formatDate(req.scheduledStartTime) : 'Time not specified'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
