
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

let app: FirebaseApp | undefined = undefined; // Initialize as undefined
let db: Firestore | undefined = undefined; // Initialize as undefined

const knownInvalidApiKeys = ["YOUR_API_KEY", "AIzaSyBEdaK17t-QaB-yvUuP6--aZiBj-tNRiHk"];

if (!getApps().length) {
  if (!firebaseConfig.apiKey || knownInvalidApiKeys.includes(firebaseConfig.apiKey)) {
    console.warn(
        'Firebase API Key is missing or is a generic placeholder in firebase.ts. Ensure NEXT_PUBLIC_FIREBASE_API_KEY is correctly set for full Firebase functionality. Firebase will not be initialized.'
    );
  } else {
    // API key seems present and not a known placeholder, attempt initialization.
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log("Firebase initialized successfully in firebase.ts");
    } catch (e) {
      console.error("Error initializing Firebase in firebase.ts:", e);
      // app and db will remain undefined
    }
  }
} else {
  app = getApp();
  try {
    db = getFirestore(app);
  } catch (e) {
    console.error("Error getting Firestore instance in firebase.ts:", e);
    // db will remain undefined
  }
}

export { app, db };
