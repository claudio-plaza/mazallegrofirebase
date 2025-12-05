
import type { Metadata } from 'next';
import { Roboto } from 'next/font/google'; // Changed from Inter to Roboto
import './globals.css';
import { Providers } from '@/components/Providers';
import { siteConfig } from '@/config/site';
import { MainLayoutWrapper } from '@/components/layout/MainLayoutWrapper';
import { Toaster } from 'sonner';


const roboto = Roboto({ // Changed from inter to roboto
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'], // Added common weights
  variable: '--font-roboto', // Changed variable name
});

export const metadata: Metadata = {
  title: `${siteConfig.name} - Gestión de Club Deportivo`,
  description: siteConfig.description,
  icons: {
    icon: '/logo-favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${roboto.variable} font-sans antialiased`}>
        <Providers>
          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>
          <Toaster 
            richColors 
            position="top-center" 
            toastOptions={{
              classNames: {
                toast: 'p-6',
                title: 'text-lg',
                description: 'text-base',
              },
            }} 
          />
        </Providers>
      </body>
    </html>
  );
}
