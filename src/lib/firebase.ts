
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);

export { app, db };
