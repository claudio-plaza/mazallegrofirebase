'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import { WhatsAppBubble } from '@/components/layout/WhatsAppBubble';
import { siteConfig } from '@/config/site';

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    // For admin routes, render children directly without the main layout structure
    return <>{children}</>;
  }

  // For all other routes, render the standard layout with Header, Footer, etc.
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-muted text-muted-foreground py-4 text-center text-sm">
        © {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
      </footer>
      <WhatsAppBubble />
    </div>
  );
}
