
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
    <header className="bg-[#0E4291] shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src="/logo-mazallegro.png" 
            alt={`${siteConfig.name} Logo`}
            width={76} 
            height={38} 
            className="h-auto" // Adjust height as needed, width will scale
            priority // Preload logo as it's LCP
          />
          <span className="text-2xl font-bold text-primary sr-only">{siteConfig.name}</span>
        </Link>
        <nav className="flex items-center space-x-2 sm:space-x-4">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Hola, {userName || 'Usuario'} ({userRole})
              </span>
              {userRole && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="mr-0 sm:mr-2 h-4 w-4" /> 
                    <span className="hidden sm:inline">Panel</span>
                  </Button>
                </Link>
              )}
              {userRole === 'socio' && (
                <Link href="/mi-perfil">
                  <Button variant="ghost" size="sm">
                    <UserCircle className="mr-0 sm:mr-2 h-4 w-4" /> 
                     <span className="hidden sm:inline">Mi Perfil</span>
                  </Button>
                </Link>
              )}
              {userRole === 'administrador' && (
                 <Link href="/admin/gestion-socios">
                   <Button variant="ghost" size="sm">
                     <Settings className="mr-0 sm:mr-2 h-4 w-4" /> 
                     <span className="hidden sm:inline">Admin</span>
                   </Button>
                 </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-0 sm:mr-2 h-4 w-4" /> 
                <span className="hidden sm:inline">Salir</span>
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
