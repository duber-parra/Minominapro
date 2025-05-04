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
// Make sure to prefix them with NEXT_PUBLIC_ so they are available on the client-side.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBEdaK17t-QaB-yvUuP6--aZiBj-tNRiHk", // Added fallback for testing, but ENV VAR is preferred
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "calculadora-de-horas-wshe0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "calculadora-de-horas-wshe0",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "calculadora-de-horas-wshe0.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "128893274714",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:128893274714:web:b8a084377a9293b534e663"
};

// Initialize Firebase only once
function ensureFirebaseInitialized() {
    // Check if API key is provided and not the placeholder
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "AIzaSyBEdaK17t-QaB-yvUuP6--aZiBj-tNRiHk" || firebaseConfig.apiKey === "YOUR_API_KEY") {
        const errorMsg = "La clave API de Firebase falta o es un marcador de posición. Por favor, verifica tu archivo .env.local (NEXT_PUBLIC_FIREBASE_API_KEY) y reinicia el servidor.";
        console.error(errorMsg, "Raw env value:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
        throw new Error(errorMsg);
    }
    if (!getApps().length) {
        try {
            console.log("Initializing Firebase..."); // Log initialization attempt
            return initializeApp(firebaseConfig);
        } catch (error: any) {
             console.error("Firebase initialization error:", error);
             // Provide a more specific error message if possible
             if (error.code === 'auth/invalid-api-key' || error.message.includes('invalid-api-key')) {
                 throw new Error("La clave API de Firebase no es válida. Revisa la configuración en Firebase Console y tu archivo .env.local.");
             }
             throw new Error("No se pudo inicializar Firebase. Revisa la consola para más detalles.");
        }
    } else {
        return getApp(); // Use existing app instance
    }
}

// --- Placeholder Function for First Login Check ---
// In a real app, this would interact with your backend/database
// to check if the user has completed the initial setup.
const isFirstLogin = async (user: User): Promise<boolean> => {
    console.log("Checking if first login for user:", user.uid);
    // Example: Check creation time vs last sign-in time.
    // This is a common pattern but might require adjusting tolerance depending on Firebase behavior.
    const isNew = user.metadata.creationTime === user.metadata.lastSignInTime;
    console.log("Is considered first login?", isNew);
    return isNew;
}
// --- End Placeholder ---


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
        const unsubscribe = onAuthStateChanged(auth, async (user) => { // Make async
          if (user) {
            // --- First Login Check ---
            const firstLogin = await isFirstLogin(user); // Check if it's the first login
            if (firstLogin) {
               console.log("First login detected, redirecting to profile setup.");
               router.push('/profile-setup'); // Redirect to setup page
            } else {
                console.log("Existing user detected, redirecting to home.");
                 router.push('/'); // Redirect to home page for existing users
            }
            // -----------------------
          } else {
            console.log('No user currently logged in (onAuthStateChanged).');
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
        console.log("Attempting Google Sign-In...");
        const app = ensureFirebaseInitialized(); // Ensure initialized before getting auth
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();
        // Consider adding custom parameters if needed, e.g., language preference
        // provider.setCustomParameters({ 'login_hint': 'user@example.com' });
        await signInWithPopup(auth, provider);
        // onAuthStateChanged will handle the redirect after checking if it's the first login
        console.log("Google Sign-In Popup successful (before onAuthStateChanged handles redirect).");
      } catch (error: any) { // Catch specific Firebase errors if possible
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
            setError(error.message); // Show the specific missing key error
        } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid') {
             setError('La clave API de Firebase no es válida. Verifica tu archivo .env.local y la configuración en Firebase Console.');
        } else if (error.code === 'auth/unauthorized-domain') {
             setError('Error: Dominio no autorizado. Asegúrate de que "' + window.location.hostname + '" esté en la lista de dominios autorizados en Firebase Auth.');
        } else {
            setError(`Error al iniciar sesión con Google: ${error.message || 'Intenta de nuevo.'}`);
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
        {/*
        <CardFooter className="flex justify-center text-sm">
          <p className="text-muted-foreground">
            ¿No tienes una cuenta?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </CardFooter>
         */}
      </Card>
    </div>
  );
}