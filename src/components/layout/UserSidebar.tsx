'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { allFeatures, siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { ChevronLeft, LogOut, Instagram, Facebook } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserSidebarProps {
  className?: string;
  isExpanded: boolean;
  onToggle?: () => void;
}

export function UserSidebar({ className, isExpanded, onToggle }: UserSidebarProps) {
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
    <TooltipProvider delayDuration={0}>
      <aside className={cn("flex flex-col bg-secondary text-secondary-foreground border-r border-secondary-foreground/20", className)}>
        <div className={cn(
          "h-16 flex items-center border-b border-secondary-foreground/20 transition-all duration-300 bg-white",
          isExpanded ? "justify-start px-4" : "justify-center px-2"
        )}>
          <Link href="/dashboard" className="flex items-center space-x-2">
            {isExpanded ? (
              <Image 
                  src="/logo-largo.jpg" 
                  alt="Logo Mazallegro"
                  data-ai-hint="company logo"
                  width={120} 
                  height={60}
                  className="h-auto" 
                  style={{ width: 'auto' }}
                  priority 
              />
            ) : (
               <Image 
                  src="/logo.png" 
                  alt="Logo Circular Mazallegro"
                  data-ai-hint="club logo"
                  width={40} 
                  height={40}
                  className="h-auto rounded-md" 
                  priority 
              />
            )}
          </Link>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {accessibleFeatures.map((feature) => (
            <Tooltip key={feature.id}>
              <TooltipTrigger asChild>
                <Link href={feature.href} passHref>
                  <Button
                    variant={pathname.startsWith(feature.href) ? 'default' : 'ghost'}
                    className={cn(
                      "w-full text-sm h-11",
                      pathname.startsWith(feature.href) 
                        ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                        : "hover:bg-primary/20 hover:text-secondary-foreground",
                      isExpanded ? "justify-start" : "justify-center p-0"
                    )}
                  >
                    <feature.icon className={cn("h-5 w-5", isExpanded && "mr-3")} />
                    <span className={cn(!isExpanded && "sr-only")}>{feature.title}</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(isExpanded && "hidden")}>
                <p>{feature.title}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <div className="p-2 border-t border-secondary-foreground/20 mt-auto">
           <Tooltip>
              <TooltipTrigger asChild>
                <Link href="https://www.instagram.com/allegroeventosmza/?hl=es" target="_blank" rel="noopener noreferrer">
                  <Button 
                    variant="ghost" 
                    className={cn("w-full text-secondary-foreground hover:bg-primary/20", !isExpanded && "justify-center p-0")}
                  >
                    <Image src="/instagram.png" alt="Instagram" width={20} height={20} className={cn("h-5 w-5", isExpanded && "mr-2")} />
                    <span className={cn(!isExpanded && "sr-only")}>Instagram</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(isExpanded && "hidden")}><p>Instagram</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="https://www.facebook.com/AllegroEventosMendoza/reels/?_rdr" target="_blank" rel="noopener noreferrer">
                  <Button 
                    variant="ghost" 
                    className={cn("w-full text-secondary-foreground hover:bg-primary/20", !isExpanded && "justify-center p-0")}
                  >
                    <Image src="/facebook.png" alt="Facebook" width={20} height={20} className={cn("h-5 w-5", isExpanded && "mr-2")} />
                    <span className={cn(!isExpanded && "sr-only")}>Facebook</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(isExpanded && "hidden")}><p>Facebook</p></TooltipContent>
            </Tooltip>
           <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn("w-full text-secondary-foreground hover:bg-primary/20", !isExpanded && "justify-center p-0")}
                  onClick={handleLogout}
                >
                  <LogOut className={cn("h-5 w-5", isExpanded && "mr-2")} />
                  <span className={cn(!isExpanded && "sr-only")}>Cerrar Sesión</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className={cn(isExpanded && "hidden")}><p>Cerrar Sesión</p></TooltipContent>
            </Tooltip>
          {onToggle && (
            <Button variant="ghost" className={cn("w-full mt-1 hover:bg-primary/20", !isExpanded && "justify-center p-0")} onClick={onToggle}>
              <ChevronLeft className={cn("h-5 w-5 transition-transform", !isExpanded && "rotate-180")} />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
