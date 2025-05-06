
'use client';

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Upload, Home } from 'lucide-react'; // Added Home icon
import { useToast } from '@/hooks/use-toast';

// Firebase imports (if needed for profile update, e.g., storing logo URL)
// import { getAuth, User } from "firebase/auth";
// import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// import { doc, setDoc, getFirestore } from "firebase/firestore";
// import { ensureFirebaseInitialized } from '@/app/login/page'; // Assuming this helper exists

export default function ProfileSetupPage() {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Note: This page assumes it's only shown after the *first* successful login.
  // Real-world implementation would need logic (e.g., checking a flag in Firebase)
  // to determine if setup is required and redirect accordingly.

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null); // Clear error on new file selection
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation (e.g., file type, size)
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen válido (JPEG, PNG, GIF, etc.).');
        setLogo(null);
        setLogoPreview(null);
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // Example: Limit to 2MB
        setError('El archivo es demasiado grande. El límite es 2MB.');
        setLogo(null);
        setLogoPreview(null);
        return;
      }

      setLogo(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLogo(null);
      setLogoPreview(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre es requerido.');
      return;
    }
    setIsLoading(true);
    setError(null);

    // --- Placeholder for Actual Save Logic ---
    // In a real app, you would:
    // 1. Upload the 'logo' file to Firebase Storage or another service. Get the URL.
    // 2. Update the user's profile (e.g., in Firestore or Firebase Auth) with the 'name' and logo URL.
    console.log('Saving profile:', { name, logoName: logo?.name });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Example: Store in localStorage (for demo purposes, replace with backend)
    if (typeof window !== 'undefined') {
        localStorage.setItem('companyName', name);
        if (logoPreview) { // Save logo as data URL (not ideal for production)
            localStorage.setItem('companyLogo', logoPreview);
        }
    }
    // --- End Placeholder ---

    setIsLoading(false);
    toast({
      title: 'Perfil Configurado',
      description: 'Tu información básica ha sido guardada.',
    });
    router.push('/'); // Redirect to home page after successful setup
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-4 py-12">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            Configuración Inicial del Perfil
          </CardTitle>
          <CardDescription>
            Completa tu información básica y sube el logo de tu empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre (Personal o Empresa)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ej: Mi Restaurante / Juan Pérez"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="text-base"
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label htmlFor="logo">Logo de la Empresa (Opcional)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*" // Accept only image files
                  onChange={handleLogoChange}
                  disabled={isLoading}
                  className="hidden" // Hide the default input
                />
                 <Label
                   htmlFor="logo"
                   className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                 >
                   <Upload className="mr-2 h-4 w-4" />
                   Seleccionar Archivo
                 </Label>
                 {logoPreview && (
                   <img
                     src={logoPreview}
                     alt="Vista previa del logo"
                     className="h-10 w-10 rounded-md border object-contain"
                   />
                 )}
                 {!logoPreview && logo && (
                    <span className="text-sm text-muted-foreground truncate">{logo.name}</span>
                 )}
              </div>
               <p className="text-xs text-muted-foreground">Tamaño máximo 2MB. Formatos recomendados: PNG, JPG.</p>
            </div>

             {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin mr-2" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Guardando...' : 'Guardar y Continuar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6"> {/* Changed to flex-col and added gap */}
           <p className="text-xs text-muted-foreground text-center">Puedes ajustar esto más tarde en tu perfil.</p>
           <Link href="/" passHref className="w-full">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Volver al Inicio
              </Button>
           </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
