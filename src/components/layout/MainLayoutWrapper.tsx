'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/Header';
import { WhatsAppBubble } from '@/components/layout/WhatsAppBubble';
import { siteConfig } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { UserSidebar } from './UserSidebar';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { PanelLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, userRole, isLoading } = useAuth();
  const isAdminRoute = pathname.startsWith('/admin');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // When routing through the main dashboard, if the user is still loading OR they have a role that
  // will be redirected away from the user dashboard, show a layout-less page.
  // This avoids flashing the user-specific sidebar for an admin/medico/portero who is about to be redirected.
  if (pathname === '/dashboard' && (isLoading || (userRole && userRole !== 'socio'))) {
    return <>{children}</>;
  }

  // Admin routes have their own layout
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Public routes (not logged in) have a simple layout with a header
  if (!isLoggedIn) {
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

  // Logged-in 'socio' routes get the new sidebar layout
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <UserSidebar 
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
        className={cn(
          'hidden md:flex md:fixed md:h-full md:z-10 transition-[width] duration-300 ease-in-out',
          isSidebarExpanded ? 'md:w-64' : 'md:w-20'
        )} 
      />
      
      <div className={cn(
        "flex flex-col transition-[padding-left] duration-300 ease-in-out",
        isSidebarExpanded ? 'md:pl-64' : 'md:pl-20'
      )}>
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-secondary">
              <UserSidebar isExpanded={true} className="flex h-full w-full" />
            </SheetContent>
          </Sheet>
          <Link href="/dashboard" className="flex items-center">
             <Image 
                src="https://placehold.co/153x76.png" 
                alt={`${siteConfig.name} Logo`}
                data-ai-hint="company logo"
                width={100} 
                height={50}
                className="h-auto"
                priority
             />
          </Link>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-8 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
       <WhatsAppBubble />
    </div>
  );
}
