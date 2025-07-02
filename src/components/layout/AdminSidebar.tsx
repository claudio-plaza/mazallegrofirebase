'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { allFeatures } from '@/config/site';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const adminFeatures = allFeatures.filter(feature => 
    feature.roles.includes('admin') || feature.roles.includes('medico') || feature.roles.includes('portero')
  );

  // Remove duplicates
  const uniqueFeatures = adminFeatures.filter((feature, index, self) =>
    index === self.findIndex((f) => f.id === feature.id)
  );

  return (
    <aside className={cn("flex flex-col bg-card border-r", className)}>
      <div className="h-16 flex items-center justify-center px-4 border-b">
        <Link href="/" className="flex items-center space-x-2">
            <Image 
                src="https://placehold.co/153x76.png" 
                alt={`${siteConfig.name} Logo`}
                data-ai-hint="company logo"
                width={120} 
                height={60}
                className="h-auto" 
                priority 
            />
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {uniqueFeatures.map((feature) => (
          <Link key={feature.id} href={feature.href} passHref>
            <Button
              variant={pathname === feature.href ? 'secondary' : 'ghost'}
              className="w-full justify-start text-sm h-11"
            >
              <feature.icon className="mr-3 h-5 w-5" />
              {feature.title}
            </Button>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t mt-auto">
          <Link href="/dashboard" passHref>
              <Button variant="outline" className="w-full">
                  <Home className="mr-2 h-4 w-4"/>
                  Volver al Panel
              </Button>
          </Link>
      </div>
    </aside>
  );
}