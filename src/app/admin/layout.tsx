'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, Menu } from 'lucide-react';
import Image from 'next/image';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { userRole } = useAuth();

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Desktop Sidebar: Now collapsible */}
      <AdminSidebar
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
        
        {/* Mobile Header from Log */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="h-10 w-10 bg-white shadow-lg"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              {!userRole ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <AdminSidebar 
                  isExpanded={true}
                  className="flex h-full w-full" 
                />
              )}
            </SheetContent>
          </Sheet>
        </div>

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-8 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
