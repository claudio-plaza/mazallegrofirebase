'use client';

import Link from 'next/link';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PanelLeft } from 'lucide-react';
import Image from 'next/image';
import { siteConfig } from '@/config/site';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Desktop Sidebar: Fixed and always visible on medium screens and up */}
      <AdminSidebar className="hidden md:flex md:fixed md:h-full md:w-64 md:z-10" />
      
      <div className="flex flex-col md:pl-64">
        {/* Mobile Header: Appears only on small screens */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 md:hidden">
          {/* Sheet component for the mobile sidebar */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              {/* The same sidebar content is rendered inside the sheet */}
              <AdminSidebar className="flex h-full w-full" />
            </SheetContent>
          </Sheet>
          {/* Mobile Header Logo */}
          <Link href="/" className="flex items-center">
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
    </div>
  );
}