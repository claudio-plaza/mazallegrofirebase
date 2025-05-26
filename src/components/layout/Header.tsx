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

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          {/* Placeholder for a logo */}
          {/* <Image src="/logo.png" alt={`${siteConfig.name} Logo`} width={40} height={40} data-ai-hint="club logo" /> */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary">
            <path d="M12 2L1 9l4 2.5V17a1 1 0 001 1h12a1 1 0 001-1V11.5L23 9 12 2zm7 13h-2v-2h2v2zm-4 0h-2v-2h2v2zm-4 0H9v-2h2v2zm8-4h-2v-2h2v2zm-4 0h-2v-2h2v2zm-4 0H9v-2h2v2zM7 15H5v-2h2v2zm0-4H5v-2h2v2z"/>
          </svg>
          <span className="text-2xl font-bold text-primary">{siteConfig.name}</span>
        </Link>
        <nav className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Hola, {userName || 'Usuario'} ({userRole})
              </span>
              {userRole && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Panel
                  </Button>
                </Link>
              )}
              {/* Example of role-specific link, can be expanded */}
              {userRole === 'socio' && (
                <Link href="/perfil">
                  <Button variant="ghost" size="sm">
                    <UserCircle className="mr-2 h-4 w-4" /> Mi Perfil
                  </Button>
                </Link>
              )}
              {userRole === 'administrador' && (
                 <Link href="/admin/gestion-socios">
                   <Button variant="ghost" size="sm">
                     <Settings className="mr-2 h-4 w-4" /> Admin
                   </Button>
                 </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Iniciar Sesión</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Crear Cuenta</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
