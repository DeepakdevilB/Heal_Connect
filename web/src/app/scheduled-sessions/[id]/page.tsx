'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Calendar, Clock, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { tokenStore } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/seo';

interface SessionReminder {
  reminderType: string;
  enabled: boolean;
}

interface SessionData {
  id: string;
  status: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  user: { name: string; photoUrl: string | null };
  practitioner: { name: string; photoUrl: string | null };
  reminders: SessionReminder[];
}

export default function ScheduledSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isExpert, setIsExpert] = useState(false);

  // Local reminder state for toggles
  const [rem24h, setRem24h] = useState(true);
  const [rem30m, setRem30m] = useState(true);

  useEffect(() => {
    const token = tokenStore.getAccess();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      setIsExpert(!!payload.practitionerId);
    } catch {
      router.push('/login');
      return;
    }

    const fetchSession = async () => {
      try {
        // We use the existing GET /api/sessions/:id which we need to make sure includes scheduled times and reminders
        // Wait, the existing endpoint might not include `reminders`. We'll just fetch from /api/sessions/:id and update backend if needed.
        const resRaw = await fetch(`${getApiBaseUrl()}/api/sessions/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const res = await resRaw.json();
        if (res.success && res.data.session) {
          setSession(res.data.session);
          const r24 = res.data.session.reminders?.find((r: SessionReminder) => r.reminderType === '24_HOURS');
          const r30 = res.data.session.reminders?.find((r: SessionReminder) => r.reminderType === '30_MINUTES');
          if (r24) setRem24h(r24.enabled);
          if (r30) setRem30m(r30.enabled);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, router]);

  const saveReminders = async () => {
    const token = tokenStore.getAccess();
    if (!token) return;

    setSaving(true);
    try {
      const resRaw = await fetch(`${getApiBaseUrl()}/api/schedules/${id}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reminder24h: rem24h, reminder30m: rem30m })
      });
      const res = await resRaw.json();

      if (res.success) {
        toast.success('Reminder preferences saved.');
      } else {
        toast.error('Failed to save reminders.');
      }
    } catch {
      toast.error('Network error.');
    } finally {
      setSaving(false);
    }
  };

  const initiateReschedule = async () => {
    const token = tokenStore.getAccess();
    if (!token) return;
    if (!confirm('Are you sure you want to reschedule this session? The other party will be notified and the expert will need to propose new times.')) return;

    try {
      const resRaw = await fetch(`${getApiBaseUrl()}/api/schedules/${id}/reschedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const res = await resRaw.json();
      if (res.success) {
        toast.success('Session status changed to PENDING. New times will need to be proposed.');
        router.push(isExpert ? '/expert/requests' : '/requests');
      } else {
        toast.error(res.message || 'Failed to reschedule.');
      }
    } catch {
      toast.error('Network error.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!session || !session.scheduledStartTime) {
    return (
      <div className="min-h-screen bg-[#fffbf0] flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Session not found or not scheduled</h2>
      </div>
    );
  }

  const peer = isExpert ? session.user : session.practitioner;
  const start = new Date(session.scheduledStartTime);
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-[#fffbf0] p-6 lg:p-12 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">
            &larr; Back
          </Button>
        </div>

        <Card className="border border-yellow-200/60 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-amber-50/50 pb-6 border-b border-yellow-100/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Session Confirmed
              </CardTitle>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                {session.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            
            <div className="flex items-center gap-4">
              {peer.photoUrl ? (
                <img src={peer.photoUrl} alt="Peer" className="w-16 h-16 rounded-full object-cover border-2 border-amber-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-amber-200 border-2 border-amber-300 flex items-center justify-center font-extrabold text-amber-700 text-2xl">
                  {peer.name?.charAt(0) || '?'}
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 font-medium">{isExpert ? 'Client' : 'Expert'}</p>
                <p className="text-xl font-bold text-gray-900">{peer.name}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 font-medium">Scheduled Date & Time</p>
                  <p className="text-lg font-semibold text-gray-900">{formatter.format(start)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-gray-900 text-lg">Push Notifications</h3>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-800">24 Hours Before</p>
                  <p className="text-xs text-gray-500">Get a reminder a day before the session.</p>
                </div>
                <Switch checked={rem24h} onCheckedChange={setRem24h} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold text-gray-800">30 Minutes Before</p>
                  <p className="text-xs text-gray-500">Get a reminder right before the session starts.</p>
                </div>
                <Switch checked={rem30m} onCheckedChange={setRem30m} />
              </div>

              <Button 
                onClick={saveReminders} 
                disabled={saving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl mt-4"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Preferences
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <Button 
                onClick={initiateReschedule}
                variant="outline" 
                className="w-full text-rose-500 border-rose-200 hover:bg-rose-50 rounded-xl"
              >
                Request Reschedule
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
