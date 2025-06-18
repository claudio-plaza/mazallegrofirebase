
import type { Metadata } from 'next';
import { Roboto } from 'next/font/google'; // Changed from Inter to Roboto
import './globals.css';
import { Providers } from '@/components/Providers';
import Header from '@/components/layout/Header';
import { siteConfig } from '@/config/site';
import { WhatsAppBubble } from '@/components/layout/WhatsAppBubble'; // Import the new component

const roboto = Roboto({ // Changed from inter to roboto
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'], // Added common weights
  variable: '--font-roboto', // Changed variable name
});

export const metadata: Metadata = {
  title: `${siteConfig.name} - Gestión de Club Deportivo`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${roboto.variable} font-sans antialiased`}> {/* Use roboto.variable */}
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <footer className="bg-muted text-muted-foreground py-4 text-center text-sm">
              © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
            </footer>
            <WhatsAppBubble /> {/* Add the WhatsApp bubble here */}
          </div>
        </Providers>
      </body>
    </html>
  );
}
