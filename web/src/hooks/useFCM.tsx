'use client';

import { useEffect, useState } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { app, requestFirebaseNotificationPermission } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { getSocket } from '@/lib/socket';

export const useFCM = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    const initFCM = async () => {
      // 1. Request Permission & Get Token
      const token = await requestFirebaseNotificationPermission();
      if (token) {
        setFcmToken(token);
        console.log("FCM Token retrieved:", token);

        // 2. Send token to our backend
        const authToken = localStorage.getItem('hc_access');
        if (authToken) {
          try {
            await fetch('/api/notifications/tokens', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                token: token,
                platform: 'web'
              })
            });
            console.log("FCM Token registered with HealConnect backend.");
          } catch (err) {
            console.error("Failed to register FCM token with backend", err);
          }
        }
      }
    };

    initFCM();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging(app);
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground push notification received:', payload);
        
        // Show visual toast in foreground
        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || '';
        
        // Use standard browser Notification if permitted, or your app's Toast UI
        if (Notification.permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        } else {
          toast.success(
            <div className="flex flex-col gap-1">
              <span className="font-bold text-gray-900">{title}</span>
              <span className="text-sm text-gray-600">{body}</span>
            </div>
          );
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  // Socket-based real-time fallback for notifications (bypasses Firebase completely for instant in-app toasts)
  useEffect(() => {
    const token = localStorage.getItem('hc_access');
    if (!token) return;

    const socket = getSocket(token);

    const handleSocketNotification = (data: { title: string; body: string }) => {
      toast(
        <div className="flex flex-col gap-1">
          <span className="font-bold text-gray-900">{data.title}</span>
          <span className="text-sm text-gray-600">{data.body}</span>
        </div>,
        {
          icon: '🔔',
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#fffbf0',
            border: '1px solid #fcd34d',
            color: '#1f2937',
          },
        }
      );
    };

    socket.on('notification', handleSocketNotification);

    return () => {
      socket.off('notification', handleSocketNotification);
    };
  }, []);

  return { fcmToken };
};
