
import type { Metadata } from 'next';
import { Roboto } from 'next/font/google'; // Changed from Inter to Roboto
import './globals.css';
import { Providers } from '@/components/Providers';
import { siteConfig } from '@/config/site';
import { MainLayoutWrapper } from '@/components/layout/MainLayoutWrapper';

const roboto = Roboto({ // Changed from inter to roboto
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'], // Added common weights
  variable: '--font-roboto', // Changed variable name
});

export const metadata: Metadata = {
  title: `${siteConfig.name} - Gestión de Club Deportivo`,
  description: siteConfig.description,
  icons: null,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${roboto.variable} font-sans antialiased`}>
        <Providers>
          <MainLayoutWrapper>
            {children}
          </MainLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
