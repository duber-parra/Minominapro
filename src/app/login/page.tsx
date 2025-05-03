
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react'; // For loading state

// Define a simple SVG for the Google icon
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
    <path fill="#EA4335" d="M24 9.5c3.1 0 5.9 1.1 8.1 3.1l6.3-6.3C34.4 2.8 29.5 1 24 1 14.9 1 7.1 6.4 3.1 14.5l7.7 6C12.5 14.2 17.8 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.2 25.1c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.6 2.9-2.1 5.4-4.5 7.1l7 5.5c4.1-3.8 6.7-9.2 6.7-15.4z"/>
    <path fill="#34A853" d="M10.8 30.5c-.4-1.2-.6-2.5-.6-3.8s.2-2.6.6-3.8l-7.7-6C1.2 19.9 0 22.9 0 26.2s1.2 6.3 3.1 8.8l7.7-4.5z"/>
    <path fill="#FBBC05" d="M24 47c5.5 0 10.4-1.8 13.8-5l-7-5.5c-1.8 1.2-4.1 1.9-6.8 1.9-6.2 0-11.5-4.7-13.4-11.1l-7.7 6C7.1 41.6 14.9 47 24 47z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    // --- Placeholder for your Authentication Logic ---
    // Replace this with your actual Firebase or backend login call
    console.log('Attempting login with:', { email, password });
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call delay
    // Example: Set error on failure
    // setError('Credenciales inválidas. Intenta de nuevo.');
    // Example: Redirect on success
    // router.push('/dashboard'); // Replace with your desired route
    // --- End Placeholder ---
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    // --- Placeholder for Google Sign-In Logic ---
    // Replace this with your actual Firebase Google Sign-In call
    console.log('Attempting Google Sign-In...');
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call delay
    // --- End Placeholder ---
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Iniciar Sesión
          </CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="text-base" // Ensure text is readable
              />
            </div>
            <div className="space-y-2">
               <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  {/* Optional: Add a "Forgot Password?" link here */}
                  {/* <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      ¿Olvidaste tu contraseña?
                  </Link> */}
               </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="text-base" // Ensure text is readable
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O continúa con
              </span>
            </div>
          </div>

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
