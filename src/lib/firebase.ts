
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "up-above-assistant",
  databaseURL: "https://up-above-assistant.firebaseio.com",
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

// Enable offline persistence
try {
    enableIndexedDbPersistence(db);
} catch (err: any) {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn('Firestore persistence failed to enable. This is likely due to multiple tabs being open.');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence.
         console.warn('Firestore persistence is not supported in this browser.');
    }
}


export { app, db };
