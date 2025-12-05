'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { getAptoMedicoStatus } from '@/lib/helpers';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SocioHeaderProps {
  titulo?: string;
  className?: string;
}

export function SocioHeader({ 
  titulo, 
  className = '' 
}: SocioHeaderProps) {
  const { socio } = useAuth();

  if (!socio) return null;

  const getBadgeEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'Inactivo':
        return 'bg-red-500 text-white hover:bg-red-600';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getBadgeAptoColor = (valido: boolean) => {
    if (valido) {
      return 'bg-green-500 text-white hover:bg-green-600';
    }
    return 'bg-yellow-500 text-white hover:bg-yellow-600';
  };

  return (
    <>
      <div className={`bg-[#EE7717] rounded-lg shadow-lg p-4 md:p-6 mb-6 ${className}`}>
        {/* Responsive: Stack en móvil, horizontal en desktop */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Avatar */}
          <Avatar className="w-16 h-16 md:w-20 md:h-20 border-4 border-white shadow-lg flex-shrink-0">
            <AvatarImage src={socio.fotoPerfil || '/placeholder-avatar.png'} />
            <AvatarFallback className="bg-white text-[#EE7717] text-lg md:text-xl font-bold">
              {socio.nombre?.[0]}{socio.apellido?.[0]}
            </AvatarFallback>
          </Avatar>

          {/* Info del socio */}
          <div className="text-white flex-1 text-center md:text-left">
            {/* Título responsive */}
            <h1 className="text-xl md:text-3xl font-bold flex items-center justify-center md:justify-start gap-2 flex-wrap">
              {titulo || `¡Bienvenido, ${socio.nombre}!`}
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" />
            </h1>
            
            {/* Badges responsive - stack en móvil */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center md:justify-start gap-2 mt-3 flex-wrap">
              <Badge variant="secondary" className="bg-white text-[#EE7717] hover:bg-gray-100 text-xs md:text-sm">
                🆔 Socio N° {socio.numeroSocio}
              </Badge>
              
              <Badge className={`${getBadgeEstadoColor(socio.estadoSocio || 'Inactivo')} text-xs md:text-sm`}>
                {socio.estadoSocio === 'Activo' ? '🔴 Activo' : '⚪ Inactivo'}
              </Badge>
              
              {(() => {
                const { status, colorClass, message } = getAptoMedicoStatus(
                  socio.aptoMedico, 
                  socio.fechaNacimiento
                );
                
                const iconMap = {
                  'Vigente': '✅',
                  'Vencido': '❌',
                  'Pendiente': '⏳',
                  'No Requerido': 'ℹ️',
                  'Sin datos': '⚠️',
                  'N/A': 'ℹ️'
                };
                
                return (
                  <Badge 
                    className={`${colorClass} text-white text-xs md:text-sm`}
                    title={message}
                  >
                    {iconMap[status as keyof typeof iconMap] || 'ℹ️'} Apto: {status}
                  </Badge>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}