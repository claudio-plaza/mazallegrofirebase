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
    // Modernized Header: Light background, subtle border, sticky positioning, and high z-index.
    <header className="bg-background/95 backdrop-blur-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo linking to home */}
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src="https://placehold.co/153x76.png" // Placeholder logo
            alt={`${siteConfig.name} Logo`}
            data-ai-hint="company logo"
            width={100} // Slightly smaller for a cleaner look
            height={50}
            className="h-auto" 
            priority 
          />
        </Link>

        {/* Navigation appears only when the user is logged in */}
        {isLoggedIn && (
          <nav className="flex items-center space-x-2 sm:space-x-4">
            {/* Welcome message, visible on larger screens */}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Hola, {userName || 'Usuario'}
            </span>

            {/* Dashboard button for all logged-in roles */}
            {userRole && (
              <Link href="/dashboard" passHref>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-foreground/80 hover:text-foreground hover:bg-muted"
                >
                  <LayoutDashboard className="h-5 w-5" /> 
                  <span className="sr-only sm:not-sr-only sm:ml-2">Panel</span>
                </Button>
              </Link>
            )}

            {/* My Profile button for 'socio' role */}
            {userRole === 'socio' && (
              <Link href="/mi-perfil" passHref>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-foreground/80 hover:text-foreground hover:bg-muted"
                >
                  <UserCircle className="h-5 w-5" /> 
                  <span className="sr-only sm:not-sr-only sm:ml-2">Mi Perfil</span>
                </Button>
              </Link>
            )}
            
            {/* Admin Settings button for 'admin' role */}
            {userRole === 'admin' && (
               <Link href="/admin/gestion-socios" passHref>
                 <Button 
                    variant="ghost"
                    size="sm" 
                    className="text-foreground/80 hover:text-foreground hover:bg-muted"
                 >
                   <Settings className="h-5 w-5" /> 
                   <span className="sr-only sm:not-sr-only sm:ml-2">Gestión</span>
                 </Button>
               </Link>
            )}

            {/* Logout Button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout} 
              className="text-foreground/80 hover:text-foreground hover:bg-muted"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Salir</span>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
