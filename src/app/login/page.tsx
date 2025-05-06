'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react'; // For loading state
import { GoogleIcon } from "@/components/icons";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    User // Import User type
} from "firebase/auth";
import { initializeApp, getApps, getApp } from "firebase/app"; // Import getApps and getApp
import { useRouter } from 'next/navigation';

// Use environment variables for Firebase config.
// IMPORTANT: Create a .env.local file in the root of your project and add these variables:
// NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
// NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once
function ensureFirebaseInitialized(): firebase.app.App | null {
    // Check if API key is provided and not the placeholder
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.error('La clave API de Firebase falta o no es válida en LoginPage. Por favor, verifica tu archivo .env.local (NEXT_PUBLIC_FIREBASE_API_KEY) y reinicia el servidor.', "Raw env value:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
        return null; // Indicate failure
    }
    if (!getApps().length) {
        try {
            console.log("Initializing Firebase in LoginPage...");
            return initializeApp(firebaseConfig);
        } catch (error: any) {
             console.error("Firebase initialization error in LoginPage:", error);
             return null; // Indicate failure
        }
    }
    return getApp();
}

// --- Placeholder Function for First Login Check ---
// In a real app, this would interact with your backend/database
// to check if the user has completed the initial setup.
const isFirstLogin = async (user: User): Promise<boolean> => {
    console.log("Checking if first login for user:", user.uid);
    // Example: Check creation time vs last sign-in time.
    // This is a common pattern but might require adjusting tolerance depending on Firebase behavior.
    const creationTime = user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : 0;
    const lastSignInTime = user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0;
    // Consider a small tolerance (e.g., 5 seconds) as times might not be exactly equal
    const isNew = Math.abs(creationTime - lastSignInTime) < 5000;
    console.log("User metadata:", user.metadata);
    console.log("Creation time:", creationTime, "Last sign-in time:", lastSignInTime);
    console.log("Is considered first login?", isNew);
    return isNew;
}
// --- End Placeholder ---


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    const app = ensureFirebaseInitialized();
    if (!app) {
        setError("Error al inicializar Firebase. Verifica la configuración.");
        setFirebaseInitialized(false);
        return;
    }
    setFirebaseInitialized(true);
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const firstLogin = await isFirstLogin(user);
        if (firstLogin) {
           console.log("First login detected, redirecting to profile setup.");
           router.push('/profile-setup');
        } else {
            console.log("Existing user detected, redirecting to home.");
            router.push('/');
        }
      } else {
        console.log('No user currently logged in (onAuthStateChanged).');
      }
    });
    return () => unsubscribe();
  }, [router]);


  const handleGoogleSignIn = async () => {
    if (!firebaseInitialized) {
        setError("Firebase no está inicializado. No se puede iniciar sesión.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        console.log("Attempting Google Sign-In...");
        const app = getApp(); // Get existing app instance
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        console.log("Google Sign-In Popup successful (before onAuthStateChanged handles redirect).");
      } catch (error: any) {
        console.error("Google Sign-In Error:", error);
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);

        if (error.code === 'auth/popup-closed-by-user') {
             setError('Inicio cancelado. Si no cerraste la ventana, revisa si tu navegador bloquea ventanas emergentes.');
        } else if (error.code === 'auth/cancelled-popup-request') {
             setError('Se canceló una solicitud de inicio de sesión anterior. Intenta de nuevo.');
        } else if (error.code === 'auth/popup-blocked') {
             setError('El navegador bloqueó la ventana emergente de Google. Habilita las ventanas emergentes para este sitio e intenta de nuevo.');
        } else if (error.code === 'auth/network-request-failed') {
            setError('Error de red. Verifica tu conexión e intenta de nuevo.');
        } else if (error.message && error.message.includes("La clave API de Firebase falta")) {
            setError(error.message);
        } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid') {
             setError('La clave API de Firebase no es válida. Verifica tu archivo .env.local y la configuración en Firebase Console.');
        } else if (error.code === 'auth/unauthorized-domain') {
             setError('Error: Dominio no autorizado. Asegúrate de que "' + window.location.hostname + '" esté en la lista de dominios autorizados en Firebase Auth.');
        } else {
            setError(`Error al iniciar sesión con Google: ${error.message || 'Intenta de nuevo.'} Codigo: ${error.code}`);
        }
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Iniciar Sesión
          </CardTitle>
          <CardDescription>
            Ingresa usando tu cuenta de Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading || !firebaseInitialized}
          >
             {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                 <GoogleIcon />
                 <span className="ml-2">Continuar con Google</span>
                </>
              )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
