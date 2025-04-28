import type {Metadata} from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a fallback/example
import './globals.css';
import { Toaster } from "@/components/ui/toaster" // Import Toaster

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' }); // Example font setup

export const metadata: Metadata = {
  title: 'Workday Calculator',
  description: 'Calculate Colombian workday pay based on hours, nights, holidays, and overtime.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
