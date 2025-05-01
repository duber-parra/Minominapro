
import type {Metadata} from 'next';
import Link from 'next/link'; // Import Link
import { Inter } from 'next/font/google'; // Using Inter as a fallback/example
import './globals.css';
import { Toaster } from "@/components/ui/toaster" // Import Toaster

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' }); // Example font setup

export const metadata: Metadata = {
  title: 'Calculadora y Planificador', // Updated title
  description: 'Calcula nómina y planifica horarios de trabajo.', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Ensure no whitespace or comments directly inside the <html> tag
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
         {/* Basic Navigation Example */}
         <nav className="bg-card border-b p-4 mb-4">
            <div className="container mx-auto flex justify-center gap-6">
                <Link href="/" className="text-foreground hover:text-primary transition-colors">
                    Calculadora Nómina
                </Link>
                <Link href="/schedule" className="text-foreground hover:text-primary transition-colors">
                    Planificador Horarios
                </Link>
            </div>
         </nav>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

    