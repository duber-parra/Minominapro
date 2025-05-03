

'use client'; // Add 'use client' because we need hooks for loading state

import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect, ReactNode } from 'react'; // Import hooks
import { usePathname } from 'next/navigation'; // Import usePathname
import { Loader2, LogIn } from 'lucide-react'; // Import Loader icon and LogIn icon
import { Separator } from '@/components/ui/separator'; // Import Separator
import CalculadoraLaboral from '@/components/labor-calculator'; // Import the new component
import { Button } from '@/components/ui/button'; // Import Button

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname(); // Get current path

  // Reset loading state when path changes
  useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Prevent navigation if already on the target page or a login/register page
    if (pathname === href || pathname === '/login' || pathname === '/register') {
        e.preventDefault();
        return;
    }
    setIsLoading(true);
    // Let the default Link behavior handle navigation after setting loading state
  };

  // Hide main navigation and footer on login/register pages
  const hideLayoutForAuth = pathname === '/login' || pathname === '/register';

  return (
    // Ensure no whitespace or comments directly inside the <html> tag
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground relative flex flex-col min-h-screen`}>
         {isLoading && <LoadingIndicator />} {/* Show loading indicator */}
         {/* Navigation */}
         {!hideLayoutForAuth && ( // Only show nav if not on auth pages
             <nav className="bg-card border-b p-4 sticky top-0 z-40"> {/* Make nav sticky */}
                <div className="container mx-auto flex justify-between items-center"> {/* Changed to justify-between */}
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
                    {/* Login Button */}
                    <Link href="/login" passHref>
                        <Button variant="outline" size="sm" onClick={(e) => handleNavClick(e, '/login')}>
                            <LogIn className="mr-2 h-4 w-4" /> Ingresar
                        </Button>
                    </Link>
                </div>
             </nav>
         )}
        {/* Adjust padding top only if nav is visible */}
        <main className={`flex-grow ${!hideLayoutForAuth ? 'pt-[calc(2rem+1rem)]' : ''} pb-16`}>
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
