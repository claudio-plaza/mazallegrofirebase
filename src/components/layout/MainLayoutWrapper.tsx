'use client';

import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import { WhatsAppBubble } from '@/components/layout/WhatsAppBubble';
import { siteConfig } from '@/config/site';
import { useAuth } from '@/hooks/useAuth';
import { UserSidebar } from './UserSidebar';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { PanelLeft, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoggedIn, userRole, isLoading, socio } = useAuth();
  const router = useRouter(); // Import and use router
  const isAdminRoute = pathname.startsWith('/admin');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Define public routes
  const publicPaths = ['/', '/login', '/signup', '/olvide-mi-contrasena'];
  const isPublicRoute = publicPaths.includes(pathname);

  useEffect(() => {
    if (!isLoading && !isLoggedIn && !isPublicRoute) {
      router.push('/login');
    }
  }, [isLoading, isLoggedIn, isPublicRoute, router]);

  // Display a full-page loader while authentication is in progress or redirecting
  if (isLoading || !isMounted || (!isLoggedIn && !isPublicRoute)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-primary"></div>
      </div>
    );
  }

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

  

  // Public routes (not logged in OR explicitly public paths) have a simple layout without a header
  if (!isLoggedIn || isPublicRoute) {
    return (
       <div className="flex flex-col min-h-screen">
        <main className="flex-grow">
          {children}
        </main>
        <WhatsAppBubble />
      </div>
    );
  }

  // Logged-in 'socio' routes get the new sidebar layout
  // If we've reached this point, user is logged in and not on a public route.
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
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-white px-4 sm:px-6 md:hidden">
          <Link href="/dashboard" className="flex items-center">
             <Image 
                src="/logo-largo.jpg" 
                alt="[Tu Logo]"
                data-ai-hint="company logo"
                width={100} 
                height={50}
                className="h-auto"
                priority
             />
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px">
                <Menu className="w-6 h-6 text-current" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-64 bg-secondary">
              <UserSidebar isExpanded={true} className="flex h-full w-full" />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-8 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
       <WhatsAppBubble />
       <footer className="bg-primary text-white text-center p-4 mt-auto">
         <p>© 2025 Mazallegro. Todos los derechos reservados. Creado por <a href="https://www.facebook.com/overalloficialagencia" target="_blank" className="text-white hover:underline">Over-all-Design</a></p>
       </footer>
    </div>
  );
}
