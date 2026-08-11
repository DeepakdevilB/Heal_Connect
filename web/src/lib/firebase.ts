import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCDtprrsBQThbv2m_mQGQgHiz9pms5adUc",
  authDomain: "healconnect-c39d4.firebaseapp.com",
  projectId: "healconnect-c39d4",
  storageBucket: "healconnect-c39d4.firebasestorage.app",
  messagingSenderId: "736067888290",
  appId: "1:736067888290:web:5f7abc3d97a6ef880263fb",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const requestFirebaseNotificationPermission = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("Firebase Messaging is not supported in this browser.");
      return null;
    }

    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { 
        vapidKey: "BLmHUikYJsC-U6N8NOoOslgFaNzRh_eJeDrfaTXJzWkNL_8R8Db9fCedeZoW_PCxYzaq5QdOsTGSbrxgTEI6VsM" 
      });
      if (currentToken) {
        return currentToken;
      } else {
        console.warn('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.warn('Notification permission denied.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

export { app };
