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
    onAuthStateChanged
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
// Make sure to prefix them with NEXT_PUBLIC_ so they are available on the client-side.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once
function ensureFirebaseInitialized() {
    // Check if API key is provided
    if (!firebaseConfig.apiKey) {
        console.error("Firebase API Key is missing in configuration object. Raw env value:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
        throw new Error("Firebase API Key is missing. Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set and the server was restarted.");
    }
    if (!getApps().length) {
        try {
            console.log("Initializing Firebase with config:", { ...firebaseConfig, apiKey: firebaseConfig.apiKey ? '***' : 'MISSING!' }); // Don't log the key itself
            return initializeApp(firebaseConfig);
        } catch (error: any) {
             console.error("Firebase initialization error:", error);
             throw new Error("Could not initialize Firebase. Check console for details.");
        }
    } else {
        return getApp(); // Use existing app instance
    }
}


export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize Firebase and check auth state on mount
    try {
        const app = ensureFirebaseInitialized();
        const auth = getAuth(app);

        // Check for existing authentication
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
            // User is signed in, redirect to home page
            router.push('/');
          } else {
            console.log('No user logged in');
          }
        });
        // Cleanup subscription on unmount
        return () => unsubscribe();

    } catch (initError: any) {
        console.error("Error during Firebase init or auth check:", initError);
        setError(initError.message || "Error al inicializar la autenticación.");
    }
  }, [router]); // Add router to dependency array


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const app = ensureFirebaseInitialized(); // Ensure initialized before getting auth
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the redirect
      } catch (error: any) { // Catch specific Firebase errors if possible
        console.error("Google Sign-In Error:", error);
        if (error.code === 'auth/popup-closed-by-user') {
             setError('El inicio de sesión con Google fue cancelado.');
        } else if (error.code === 'auth/network-request-failed') {
            setError('Error de red. Verifica tu conexión e intenta de nuevo.');
        } else if (error.message && error.message.includes("Firebase API Key is missing")) {
            setError(error.message); // Show the specific missing key error
        } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid') {
             setError('La clave API de Firebase no es válida. Verifica tu archivo .env.local y la configuración en Firebase Console.');
        } else {
            setError('Error al iniciar sesión con Google. Intenta de nuevo.');
        }
      } finally { // Ensure isLoading is set to false even if there's an error
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
        <CardContent className="space-y-6"> {/* Increased space */}
          {error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}

          {/* Google Sign-In Button is the only option */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
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
         {/* Optionally keep the link to register, or remove if registration is also Google-only */}
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
