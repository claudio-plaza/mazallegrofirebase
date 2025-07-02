'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import { LogOut, UserCircle, Settings, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const Header = () => {
  const { isLoggedIn, userRole, userName, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh(); // Force a refresh to ensure layout updates
  };

  return (
    <header className="bg-secondary shadow-md sticky top-0 z-50"> {/* Changed to bg-secondary */}
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src="https://placehold.co/76x38.png" 
            alt={`${siteConfig.name} Logo`}
            data-ai-hint="club logo"
            width={76} 
            height={38} 
            className="h-auto" 
            priority 
          />
          {/* Site name text is now part of the image, or can be added if needed with text-secondary-foreground */}
          <span className="text-2xl font-bold text-secondary-foreground sr-only">{siteConfig.name}</span>
        </Link>
        {isLoggedIn && (
          <nav className="flex items-center space-x-2 sm:space-x-4">
            <>
              <span className="text-sm text-secondary-foreground/80 hidden sm:inline"> {/* Adjusted for contrast */}
                Hola, {userName || 'Usuario'} ({userRole})
              </span>
              {userRole && (
                <Link href="/dashboard">
                  <Button 
                    size="sm" 
                    className="bg-secondary text-secondary-foreground border border-secondary-foreground/30 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  >
                    <LayoutDashboard className="mr-0 sm:mr-2 h-4 w-4" /> 
                    <span className="hidden sm:inline">Panel</span>
                  </Button>
                </Link>
              )}
              {userRole === 'socio' && (
                <Link href="/mi-perfil">
                  <Button 
                    size="sm" 
                    className="bg-secondary text-secondary-foreground border border-secondary-foreground/30 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  >
                    <UserCircle className="mr-0 sm:mr-2 h-4 w-4" /> 
                     <span className="hidden sm:inline">Mi Perfil</span>
                  </Button>
                </Link>
              )}
              {userRole === 'admin' && (
                 <Link href="/admin/gestion-socios">
                   <Button 
                     size="sm" 
                     className="bg-secondary text-secondary-foreground border border-secondary-foreground/30 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                   >
                     <Settings className="mr-0 sm:mr-2 h-4 w-4" /> 
                     <span className="hidden sm:inline">Gestión de Socios</span>
                   </Button>
                 </Link>
              )}
              <Button 
                size="sm" 
                onClick={handleLogout} 
                className="bg-secondary text-secondary-foreground border border-secondary-foreground/30 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              >
                <LogOut className="mr-0 sm:mr-2 h-4 w-4" /> 
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
