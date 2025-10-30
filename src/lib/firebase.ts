
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "up-above-assistant",
  databaseURL: "https://up-above-assistant.firebaseio.com",
  appId: "1:89751477177:web:f8f5db742d259c0e4a3468",
  storageBucket: "up-above-assistant.firebasestorage.app",
  apiKey: "AIzaSyCOhw-NRBHer8HV6pmLGHhz0YDxu5c2WCA",
  authDomain: "up-above-assistant.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "89751477177"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: 'PRIMARY' }),
});


export { app, db };
