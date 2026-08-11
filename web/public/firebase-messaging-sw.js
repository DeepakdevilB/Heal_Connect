// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
const firebaseConfig = {
  apiKey: "AIzaSyCDtprrsBQThbv2m_mQGQgHiz9pms5adUc",
  authDomain: "healconnect-c39d4.firebaseapp.com",
  projectId: "healconnect-c39d4",
  storageBucket: "healconnect-c39d4.firebasestorage.app",
  messagingSenderId: "736067888290",
  appId: "1:736067888290:web:5f7abc3d97a6ef880263fb"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Customize notification here
  const notificationTitle = payload.notification.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
