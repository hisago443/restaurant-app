
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "up-above-assistant",
  appId: "1:89751477177:web:f8f5db742d259c0e4a3468",
  storageBucket: "up-above-assistant.firebasestorage.app",
  apiKey: "AIzaSyA8i6e5rB5DtqzxzxRrCWel0kpnljVy-2w",
  authDomain: "up-above-assistant.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "89751477177"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
