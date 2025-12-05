'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SocioDashboard } from '@/components/dashboard/SocioDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex flex-col items-center justify-center z-50 text-white p-6">
    <div className="mb-10">
      <Loader2 className="w-28 h-28 animate-spin text-orange-400 drop-shadow-2xl" />
    </div>
    
    <h2 className="text-5xl md:text-6xl font-bold text-center mb-6 tracking-tight">
      Cargando tu perfil
    </h2>
    
    <p className="text-xl md:text-2xl text-blue-100 text-center mb-12 max-w-2xl leading-relaxed">
      Estamos preparando todo para ti...
    </p>
    
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-4 mb-12 border border-white/20">
      <p className="text-lg md:text-xl font-medium text-orange-300 text-center animate-pulse">
        Cargando información del socio...
      </p>
    </div>
    
    <div className="mt-10 flex items-center gap-3">
      <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.5s' }}></div>
      <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.5s' }}></div>
      <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.5s' }}></div>
    </div>
    
    <p className="mt-8 text-sm text-blue-300 text-center">
      ✨ Ya casi estamos listos
    </p>
  </div>
);

export default function DashboardPage() {
  const { userRole, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (typeof window === 'undefined' || isAuthLoading) {
      return; 
    }
    
    if (userRole) {
      if (userRole === 'admin') {
        window.location.replace('/admin/gestion-socios');
      } else if (userRole === 'medico') {
        window.location.replace('/admin/panel-medico');
      } else if (userRole === 'portero') {
        window.location.replace('/admin/control-acceso');
      }
    }
  }, [userRole, isAuthLoading]);

  if (isAuthLoading || (userRole && userRole !== 'socio')) {
    return <LoadingScreen />;
  }
  
  if (userRole === 'socio') {
    return <SocioDashboard />;
  }

  // Fallback for any other case (e.g., user logged in but no role assigned, or auth error)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-5xl">⚠️</span>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
          Error de Permisos
        </h2>
        
        <p className="text-lg text-gray-700 mb-6 text-center leading-relaxed">
          Has iniciado sesión, pero tu cuenta aún no tiene permisos asignados.
        </p>
        
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-blue-900 mb-3 text-center">
            📋 Sigue estos pasos:
          </h3>
          <ol className="space-y-3 text-blue-900">
            <li className="flex items-start gap-3">
              <span className="font-bold text-2xl">1.</span>
              <span className="text-base leading-relaxed">
                <strong>Recarga esta página</strong> presionando F5 o el botón de recargar del navegador
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-bold text-2xl">2.</span>
              <span className="text-base leading-relaxed">
                Si el problema persiste después de recargar, <strong>contacta al administrador del club</strong>
              </span>
            </li>
          </ol>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl text-lg transition-colors shadow-lg"
        >
          🔄 Recargar Página
        </button>
        
        <p className="text-sm text-gray-500 mt-4 text-center">
          Si acabas de registrarte, puede tomar unos segundos en cargar tu perfil.
        </p>
      </div>
    </div>
  );
}
