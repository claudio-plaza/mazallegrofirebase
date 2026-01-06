'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Calendar, Building, AlertTriangle, ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { SolicitarCambioFotoDialog } from '@/components/perfil/SolicitarCambioFotoDialog';
import { TipoFotoSolicitud, AptoMedicoInfo } from '@/types';
import { SocioHeader } from '@/components/layout/SocioHeader';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { EliminarCuentaDialog } from '@/components/perfil/EliminarCuentaDialog';
import { getAptoMedicoStatus } from '@/lib/helpers';

interface SocioData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  dni: string;
  fechaNacimiento: any;
  empresaSindicato?: string;
  numeroSocio?: string;
  estadoClub: string;
  estadoSocio: string;
  fotoPerfil?: string;
  fotoDniFrente?: string;
  fotoDniDorso?: string;
  fotoCarnet?: string;
  aptoMedico?: AptoMedicoInfo;
}

const DocumentoItem = ({ socio, title, url, tipoFoto }: { socio: SocioData, title: string, url?: string, tipoFoto: TipoFotoSolicitud }) => (
  <div className="space-y-2">
    <Label>{title}</Label>
    <div className="relative w-full h-40 rounded-lg overflow-hidden border-2 border-dashed bg-gray-100 flex items-center justify-center">
      {url ? (
        <Image
          src={url}
          alt={title}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
          onError={(e) => { e.currentTarget.src = '/logo-largo.jpg'; }}
        />
      ) : (
        <div className="text-xs text-gray-400">Sin foto</div>
      )}
    </div>
    <SolicitarCambioFotoDialog
      socioId={socio.id}
      socioNombre={`${socio.nombre} ${socio.apellido}`}
      socioNumero={socio.numeroSocio || ''}
      tipoPersona="Titular"
      fotoActualUrl={url || null}
      tipoFotoInicial={tipoFoto}
    />
  </div>
);

export default function MiPerfilPage() {
  const { user } = useAuth();
  const [socio, setSocio] = useState<SocioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!user) return;

      try {
        const socioDoc = await getDoc(doc(db, 'socios', user.uid));
        
        if (socioDoc.exists()) {
          const data = socioDoc.data() as SocioData;
          setSocio(data);
          console.log('📄 Foto DNI Frente:', data?.fotoDniFrente);
          console.log('📄 Foto DNI Dorso:', data?.fotoDniDorso);
          console.log('📷 Foto Perfil:', data?.fotoPerfil);
          console.log('🎫 Foto Carnet:', data?.fotoCarnet);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!socio) {
    return (
      <div className="p-6">
        <p className="text-center text-red-600">Error al cargar datos del perfil</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <SocioHeader titulo="Mi Perfil" />
      
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-orange-500" />
            Información Personal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{socio.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Teléfono</p>
                <p className="font-medium">{socio.telefono}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Dirección</p>
                <p className="font-medium">{socio.direccion}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                <p className="font-medium">
                  {socio.fechaNacimiento?.toDate().toLocaleDateString('es-AR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">DNI</p>
                <p className="font-medium">{socio.dni}</p>
              </div>
            </div>

            {socio.empresaSindicato && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Empresa/Sindicato</p>
                  <p className="font-medium">{socio.empresaSindicato}</p>
                </div>
              </div>
            )}

            {/* ESTADO MÉDICO */}
            {(() => {
              const apto = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);
              return (
                <div className={`col-span-1 md:col-span-2 flex flex-col gap-2 p-3 rounded-lg border-2 ${apto.colorClass.replace('text-', 'border-').replace('bg-', 'bg-opacity-10 ')}`}>
                  <div className="flex items-center gap-3">
                    {apto.status === 'Válido' && <ShieldCheck className="w-6 h-6 text-green-600" />}
                    {(apto.status === 'Vencido' || apto.status === 'Inválido') && <ShieldAlert className="w-6 h-6 text-red-600" />}
                    {apto.status === 'Pendiente' && <AlertTriangle className="w-6 h-6 text-yellow-600" />}
                    {apto.status === 'No Aplica' && <Info className="w-6 h-6 text-gray-600" />}
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Estado Médico</p>
                      <p className="font-bold text-lg leading-tight">{apto.status}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 px-1">{apto.message}</p>
                  {apto.observaciones && (
                    <div className="mt-1 p-2 bg-white/50 rounded border border-current/10">
                      <p className="text-xs font-semibold text-gray-500">Observaciones del Médico:</p>
                      <p className="text-sm italic">{apto.observaciones}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN DE DOCUMENTOS */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Mis Documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DocumentoItem 
              socio={socio}
              title="Foto de Perfil" 
              url={socio.fotoPerfil} 
              tipoFoto={TipoFotoSolicitud.FOTO_PERFIL} 
            />
            <DocumentoItem 
              socio={socio}
              title="DNI Frente" 
              url={socio.fotoDniFrente} 
              tipoFoto={TipoFotoSolicitud.FOTO_DNI_FRENTE} 
            />
            <DocumentoItem 
              socio={socio}
              title="DNI Dorso" 
              url={socio.fotoDniDorso} 
              tipoFoto={TipoFotoSolicitud.FOTO_DNI_DORSO} 
            />
            <DocumentoItem 
              socio={socio}
              title="Foto Carnet" 
              url={socio.fotoCarnet} 
              tipoFoto={TipoFotoSolicitud.FOTO_CARNET} 
            />
          </div>
        </CardContent>
      </Card>

      {/* ZONA DE PELIGRO */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertTriangle className="mr-2 h-5 w-5" /> Eliminación de Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 border-t border-destructive/20">
            <div className="p-4 bg-destructive/10 rounded-lg space-y-3">
              <h4 className="font-semibold text-destructive">Eliminar Cuenta</h4>
              <p className="text-sm text-destructive/80">
                  La eliminación de tu cuenta es una acción permanente e irreversible. Se borrarán todos tus datos, los de tu grupo familiar y tu historial en el club.
              </p>
              <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
                  Solicitar eliminación de mi cuenta
              </Button>
            </div>
        </CardContent>
      </Card>

      <EliminarCuentaDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} />
    </div>
  );
}
