'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { allFeatures } from '@/config/site';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Home, LogOut } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface UserSidebarProps {
  className?: string;
}

export function UserSidebar({ className }: UserSidebarProps) {
  const pathname = usePathname();
  const { userRole, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  const accessibleFeatures = allFeatures.filter(feature => 
    userRole && feature.roles.includes(userRole)
  );

  return (
    <aside className={cn("flex flex-col bg-secondary text-secondary-foreground", className)}>
      <div className="h-16 flex items-center justify-center px-4 border-b border-secondary-foreground/20">
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
        {accessibleFeatures.map((feature) => (
          <Link key={feature.id} href={feature.href} passHref>
            <Button
              variant={pathname === feature.href ? 'default' : 'ghost'}
              className={cn(
                "w-full justify-start text-sm h-11",
                pathname === feature.href 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-primary/20 hover:text-secondary-foreground"
              )}
            >
              <feature.icon className="mr-3 h-5 w-5" />
              {feature.title}
            </Button>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-secondary-foreground/20 mt-auto">
          <Button variant="ghost" className="w-full hover:bg-primary/20" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4"/>
              Cerrar Sesión
          </Button>
      </div>
    </aside>
  );
}
