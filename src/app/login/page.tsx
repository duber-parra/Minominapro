
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
import { initializeApp, getApp } from "firebase/app"; // Import getApp
import { useRouter } from 'next/navigation';

// TODO: add .env variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, // Use environment variables
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once
let firebaseApp: ReturnType<typeof initializeApp> | undefined = undefined;
function ensureFirebaseInitialized() {
    if (!firebaseApp) {
        try {
            firebaseApp = initializeApp(firebaseConfig);
        } catch (error: any) {
            if (error.code === 'app/duplicate-app') {
                 firebaseApp = getApp(); // Use existing app instance
            } else {
                console.error("Firebase initialization error:", error);
                throw error; // Rethrow other errors
            }
        }
    }
    return firebaseApp;
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

    } catch (initError) {
        console.error("Error during Firebase init or auth check:", initError);
        setError("Error al inicializar la autenticación.");
    }
  }, [router]); // Add router to dependency array


  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const app = ensureFirebaseInitialized();
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the redirect
      } catch (error) {
        console.error("Google Sign-In Error:", error);
        setError('Error al iniciar sesión con Google. Intenta de nuevo.');
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
