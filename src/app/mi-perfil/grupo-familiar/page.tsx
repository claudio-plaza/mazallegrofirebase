'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { PlusCircle, Edit, Users, AlertCircle, CheckCircle, Clock, XCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState } from 'react';
import { AgregarEditarFamiliarDialog } from '@/components/perfil/AgregarEditarFamiliarDialog';
import { SolicitarCambioFotoDialog } from '@/components/perfil/SolicitarCambioFotoDialog';

import { TipoFotoSolicitud, RelacionFamiliar, EstadoCambioFamiliares, type MiembroFamiliar } from '@/types';
import { SocioHeader } from '@/components/layout/SocioHeader';

type MiembroFamiliarConEstado = MiembroFamiliar & { estado: 'Aprobado' | 'Pendiente' };

export default function FamiliaresPage() {
  const { socio } = useAuth();
  const [familiarEditando, setFamiliarEditando] = useState<MiembroFamiliar | 'nuevo' | null>(null);

  if (!socio) {
    return (
      <div className="container max-w-6xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error de Permisos</AlertTitle>
          <AlertDescription>
            Tu cuenta no tiene un perfil de socio asignado. Por favor, contacta a la administración del club para que te den acceso.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const familiaresAprobados = socio.familiares || [];
  const familiaresPendientes = socio.cambiosPendientesFamiliares || [];
  const estadoCambio = socio.estadoCambioFamiliares || 'Ninguno';

  // Unificar las listas para la UI
  const todosLosFamiliares: MiembroFamiliarConEstado[] = familiaresAprobados.map(f => ({ ...f, estado: 'Aprobado' }));

  if (estadoCambio === 'Pendiente') {
    familiaresPendientes.forEach(pendiente => {
      const index = todosLosFamiliares.findIndex(aprobado => aprobado.id === pendiente.id);
      if (index !== -1) {
        // Es una edición, reemplazar el aprobado con el pendiente
        todosLosFamiliares[index] = { ...pendiente, estado: 'Pendiente' };
      } else {
        // Es una adición nueva
        todosLosFamiliares.push({ ...pendiente, estado: 'Pendiente' });
      }
    });
  }

  

  return (
    <div className="container max-w-6xl py-8">
      <SocioHeader titulo="Gestionar Familiares" />

      <div className="flex justify-end items-center mb-6">
        <Button 
          onClick={() => setFamiliarEditando('nuevo')}
          disabled={estadoCambio === EstadoCambioFamiliares.PENDIENTE}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Familiar
        </Button>
      </div>

      {estadoCambio === EstadoCambioFamiliares.PENDIENTE && (
        <Alert className="mb-6 bg-yellow-50 border-yellow-200">
          <Clock className="h-5 w-5 text-yellow-600" />
          <AlertTitle>Cambios Pendientes de Aprobación</AlertTitle>
          <AlertDescription>
            Tienes solicitudes de cambio pendientes. Serán revisadas pronto.
          </AlertDescription>
        </Alert>
      )}

      {estadoCambio === EstadoCambioFamiliares.RECHAZADO && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Última Solicitud Rechazada</AlertTitle>
          <AlertDescription>
            Motivo: {socio.motivoRechazoFamiliares || 'No especificado'}
          </AlertDescription>
        </Alert>
      )}

      

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {todosLosFamiliares.map((familiar) => (
          <Card key={familiar.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={familiar.fotoPerfil || ''} />
                  <AvatarFallback>
                    {familiar.nombre && familiar.apellido ? `${familiar.nombre[0]}${familiar.apellido[0]}` : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">
                    {familiar.nombre || 'Nombre no disponible'} {familiar.apellido || ''}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {familiar.relacion}
                    </Badge>
                    <Badge variant={familiar.estado === 'Aprobado' ? 'default' : 'outline'} 
                           className={`text-xs ${familiar.estado === 'Aprobado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {familiar.estado}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">DNI: {familiar.dni || 'No disponible'}</p>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  disabled={familiar.estado === 'Pendiente'}
                  onClick={() => setFamiliarEditando(familiar)}
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Editar Datos
                </Button>
                <SolicitarCambioFotoDialog
                  socioId={socio.id}
                  socioNombre={`${socio.nombre} ${socio.apellido}`}
                  socioNumero={socio.numeroSocio}
                  tipoPersona="Familiar"
                  familiarId={familiar.id}
                  fotoActualUrl={familiar.fotoPerfil}
                  tipoFotoInicial={TipoFotoSolicitud.FOTO_PERFIL}
                  trigger={
                    <Button size="sm" variant="outline" disabled={familiar.estado === 'Pendiente'}>
                      <Edit className="mr-1 h-3 w-3" />
                      Foto
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {todosLosFamiliares.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tienes familiares registrados</p>
            <Button 
              className="mt-4" 
              onClick={() => setFamiliarEditando('nuevo')}
              disabled={estadoCambio === EstadoCambioFamiliares.PENDIENTE}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Agregar Primer Familiar
            </Button>
          </CardContent>
        </Card>
      )}

      

      {familiarEditando && (
        <AgregarEditarFamiliarDialog
          familiarToEdit={familiarEditando === 'nuevo' ? undefined : familiarEditando}
          onClose={() => {
            setFamiliarEditando(null);
          }}
          socioId={socio.id}
          familiaresActuales={socio.familiares || []}
        />
      )}
    </div>
  );
}
