// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Required for RTDB if used elsewhere
};

let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  // Check for truly missing or default placeholder API key for a warning
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.warn(
        'Firebase API Key is missing or is a generic placeholder in firebase.ts. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is correctly set in .env.local for full Firebase functionality. Attempting initialization...'
    );
  } else if (firebaseConfig.apiKey === "AIzaSyBEdaK17t-QaB-yvUuP6--aZiBj-tNRiHk") {
  // Always attempt to initialize Firebase if no app is found.
  // Actual API key validity will be checked by Firebase SDK during operations.
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.error("Error initializing Firebase in firebase.ts:", e);
    // db will remain undefined if initializeApp or getFirestore fails
  }

} else {
  app = getApp();
  try {
    db = getFirestore(app);
  } catch (e) {
    console.error("Error getting Firestore instance in firebase.ts:", e);
    // db will remain undefined if getFirestore fails
  }
}

export { app, db };
