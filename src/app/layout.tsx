
'use client'; // Add 'use client' because we need hooks for loading state

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image'; // Import next/image
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect, ReactNode } from 'react'; // Import hooks
import { usePathname, useRouter } from 'next/navigation'; // Import usePathname and useRouter
import { Loader2, LogIn, User as UserIcon, LogOut } from 'lucide-react'; // Import Loader icon, LogIn icon, UserIcon, LogOut
import { Separator } from '@/components/ui/separator'; // Import Separator
import CalculadoraLaboral from '@/components/labor-calculator'; // Import the new component
import { Button } from '@/components/ui/button'; // Import Button
import {
  getAuth,
  onAuthStateChanged,
  User, // Import User type
  signOut, // Import signOut
} from "firebase/auth";
import { initializeApp, getApps, getApp } from "firebase/app";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

// Initialize Firebase (ensure this is consistent with your login page)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function ensureFirebaseInitialized() {
    if (!getApps().length) {
      // Check if API key is provided and not the placeholder
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
          console.error('Firebase API Key is missing or invalid in RootLayout. Please verify your .env.local file (NEXT_PUBLIC_FIREBASE_API_KEY) and restart the server.');
          return null; // Indicate failure
      }
        try {
            return initializeApp(firebaseConfig);
        } catch (error) {
            console.error("Firebase initialization error in RootLayout:", error);
            return null;
        }
    }
    return getApp();
}


// Separate component for the loading overlay
function LoadingIndicator() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Cargando...</p>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isNavigating, setIsNavigating] = useState(false); // For navigation loading
  const [isAuthLoading, setIsAuthLoading] = useState(true); // For initial Firebase auth loading
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State for current user
  const [companyLogo, setCompanyLogo] = useState<string | null>(null); // State for company logo
  const pathname = usePathname();
  const router = useRouter(); // For navigation

  useEffect(() => {
    setIsAuthLoading(true); // Indicate that auth check is starting
    const app = ensureFirebaseInitialized();
    if (!app) {
        setIsAuthLoading(false); // Firebase init failed, stop auth loading
        return;
    }

    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false); // Auth state has been determined
    });

    // Load company logo from localStorage
    if (typeof window !== 'undefined') {
        const savedLogo = localStorage.getItem('companyLogo');
        if (savedLogo) {
            setCompanyLogo(savedLogo);
        }
    }

    return () => unsubscribe();
  }, []);


  // Reset navigation loading state when path changes
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string) => {
    // Prevent navigation if already on the target page or a login/register page
    if (pathname === href || (href === '/login' && (pathname === '/login' || pathname === '/register'))) {
        e.preventDefault();
        return;
    }
    setIsNavigating(true); // Set navigation loading state
    // Let the default Link behavior or router.push handle navigation after setting loading state
  };

  const handleSignOut = async () => {
    const app = ensureFirebaseInitialized();
    if (!app) return;
    const auth = getAuth(app);
    setIsNavigating(true); // Show loader during sign out
    try {
      await signOut(auth);
      setCurrentUser(null); // This will trigger onAuthStateChanged, which will set isAuthLoading appropriately
      router.push('/login'); // Redirect to login after sign out
    } catch (error) {
      console.error("Error signing out:", error);
      // Handle sign-out error (e.g., show a toast)
    } finally {
      setIsNavigating(false); // Stop navigation loader
    }
  };


  // Hide main navigation and footer on login/register/profile-setup pages
  const hideLayoutForAuth = pathname === '/login' || pathname === '/register' || pathname === '/profile-setup';
  const showLoadingIndicator = isNavigating || isAuthLoading;

  return (
    // Ensure no whitespace or comments directly inside the <html> tag
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground relative flex flex-col min-h-screen`}>
         {showLoadingIndicator && <LoadingIndicator />} {/* Show loading indicator */}
         {/* Navigation */}
         {!hideLayoutForAuth && ( // Only show nav if not on auth pages
             <nav className="bg-card border-b p-4 sticky top-0 z-40 w-full"> {/* Make nav sticky and full width */}
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 lg:px-8"> {/* Use max-width and padding instead of container */}
                    {/* Main Navigation Links */}
                    <div className="flex justify-center gap-6">
                        <Link
                            href="/"
                            onClick={(e) => handleNavClick(e, '/')}
                            className={`text-foreground hover:text-primary transition-colors ${pathname === '/' ? 'font-bold text-primary' : ''}`}
                            aria-current={pathname === '/' ? 'page' : undefined}
                        >
                            Calculadora Nómina
                        </Link>
                        <Link
                            href="/schedule"
                            onClick={(e) => handleNavClick(e, '/schedule')}
                            className={`text-foreground hover:text-primary transition-colors ${pathname === '/schedule' ? 'font-bold text-primary' : ''}`}
                            aria-current={pathname === '/schedule' ? 'page' : undefined}
                        >
                            Planificador Horarios
                        </Link>
                    </div>
                    {/* Login/Profile Button */}
                    {currentUser ? (
                        <div className="flex items-center gap-2">
                             {companyLogo && (
                                <Image
                                    src={companyLogo}
                                    alt="Logo Empresa"
                                    width={32}
                                    height={32}
                                    className="rounded-full object-contain"
                                    data-ai-hint="company logo"
                                />
                             )}
                             <span className="text-sm font-medium text-foreground hidden sm:inline">
                                {currentUser.displayName || currentUser.email}
                             </span>
                            <Link href="/profile-setup" passHref>
                                <Button variant="ghost" size="sm" onClick={(e) => handleNavClick(e, '/profile-setup')} title="Configurar Perfil">
                                    <UserIcon className="mr-0 sm:mr-2 h-4 w-4" />
                                    <span className="hidden sm:inline">Perfil</span>
                                </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" /> Salir
                            </Button>
                        </div>
                    ) : (
                        <Link href="/login" passHref>
                            <Button variant="outline" size="sm" onClick={(e) => handleNavClick(e, '/login')}>
                                <LogIn className="mr-2 h-4 w-4" /> Ingresar
                            </Button>
                        </Link>
                    )}
                </div>
             </nav>
         )}
        {/* Adjust padding top only if nav is visible */}
        <main className={`flex-grow w-full ${!hideLayoutForAuth ? 'pt-6' : ''} pb-16`}> {/* Adjusted padding-top */}
            {children}
        </main>
        <Toaster />

        {/* Footer */}
        {!hideLayoutForAuth && ( // Only show footer if not on auth pages
            <footer className="mt-auto w-full"> {/* Ensure footer is at the bottom */}
               <div className="max-w-5xl mx-auto px-[150px]"> {/* Horizontal margins/padding */}
                 <Separator className="bg-border/50" /> {/* Thin gray line */}
               </div>
               <div className="py-4 text-center text-xs text-muted-foreground">
                  Desarrollado por Duber Parra, Dpana company © 2025 Calculadora de Turnos y Recargos
               </div>
            </footer>
        )}

         {/* Floating Labor Calculator - Optionally hide on auth pages */}
         {!hideLayoutForAuth && <CalculadoraLaboral />}
      </body>
    </html>
  );
}
