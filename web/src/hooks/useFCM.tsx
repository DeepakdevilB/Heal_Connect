'use client';

import { useEffect, useState } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { app, requestFirebaseNotificationPermission } from '@/lib/firebase';
// Assuming you have a toast library, you can import it here. Or use console.log
// import { toast } from 'react-hot-toast'; 

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
            await fetch('http://localhost:8082/api/notifications/tokens', {
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
          alert(`${title}\n${body}`); // Fallback
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  return { fcmToken };
};
