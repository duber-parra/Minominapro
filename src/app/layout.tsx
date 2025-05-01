import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a fallback/example
import './globals.css';
import { Toaster } from "@/components/ui/toaster" // Import Toaster

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' }); // Example font setup

export const metadata: Metadata = {
  title: 'Calculadora de Jornada Laboral',
  description: 'Calcula el pago de la jornada laboral colombiana según horas, noches, festivos y horas extras.',
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
