'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAptoMedicoStatus } from '@/lib/helpers';
import { 
  User, 
  Users, 
  CreditCard, 
  UserPlus, 
  Shield, 
  Megaphone,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowRight,
  Sparkles,
  X,
  AlertTriangle,
  Loader2,
  Upload,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  ShieldQuestion
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getNovedades } from '@/lib/firebase/firestoreService';
import type { Socio, Novedad, AptoMedicoDisplay } from '@/types';
import { SocioHeader } from '@/components/layout/SocioHeader';

export function SocioDashboard() {
  const router = useRouter();
  const { user, socio: socioFromContext, isLoading: isAuthLoading } = useAuth();
  const [socio, setSocio] = useState<Socio | null>(null);
  const [loading, setLoading] = useState(true);
  const [cantidadAdherentes, setCantidadAdherentes] = useState(0);
  const [aptoMedicoStatus, setAptoMedicoStatus] = useState<AptoMedicoDisplay | null>(null);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [showNovedades, setShowNovedades] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<'loading' | 'complete' | 'pending' | null>(null);

  // ✅ Escuchar cambios en tiempo real del perfil del socio para el estado de la subida
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'socios', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        if (data.imagenesSubidas === true) {
          setUploadStatus('complete');
        } else if (data.imagenesPendientes === true) {
          setUploadStatus('pending');
        } else if (data.imagenesSubidas === false && !data.imagenesPendientes) {
          setUploadStatus('loading');
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    const fetchNovedades = async () => {
      try {
        const news = await getNovedades();
        setNovedades(news);
      } catch (error) {
        console.error("Error fetching novedades:", error);
      }
    };
    fetchNovedades();
  }, []);

  useEffect(() => {
    const cargarDatosSocio = async () => {
      if (!user) return;

      try {
        if (socioFromContext) {
          setSocio(socioFromContext);

          // Usar la función centralizada para obtener el estado del apto médico
          const status = getAptoMedicoStatus(socioFromContext.aptoMedico, socioFromContext.fechaNacimiento);
          setAptoMedicoStatus(status);

          // Contar adherentes
          const adherentesRef = collection(db, 'adherentes');
          const q = query(adherentesRef, where("socioTitularId", "==", user.uid));
          const adherentesSnap = await getDocs(q);
          setCantidadAdherentes(adherentesSnap.size);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!isAuthLoading) {
        cargarDatosSocio();
    }
  }, [user, socioFromContext, isAuthLoading]);

  if (loading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!socio) {
    return (
      <div className="p-6">
        <p className="text-center text-red-600">Error al cargar datos del socio. Intenta recargar la página.</p>
      </div>
    );
  }

  const funcionalidades = [
    { id: 'perfil', titulo: 'Mi Perfil', descripcion: 'Visualiza tus datos personales.', icono: User, href: '/mi-perfil', color: 'from-blue-500 to-blue-600' },
    { id: 'grupo-familiar', titulo: 'Grupo Familiar', descripcion: 'Gestiona los miembros de tu grupo.', icono: Users, href: '/mi-perfil/grupo-familiar', color: 'from-purple-500 to-purple-600' },
    { id: 'carnet', titulo: 'Carnet Digital', descripcion: 'Accede a tu carnet de socio digital.', icono: CreditCard, href: '/carnet', color: 'from-green-500 to-green-600' },
    { id: 'invitados', titulo: 'Invitados del Día', descripcion: 'Registra tus invitados para el acceso.', icono: UserPlus, href: '/invitados-diarios', color: 'from-orange-500 to-orange-600' },
    { id: 'adherentes', titulo: 'Mis Adherentes', descripcion: 'Gestiona tus adherentes y solicita nuevos.', icono: Shield, href: '/mis-adherentes', color: 'from-teal-500 to-teal-600', badge: cantidadAdherentes > 0 ? cantidadAdherentes.toString() : null },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <SocioHeader titulo={`¡Bienvenido, ${socio.nombre}!`} />
        
        {aptoMedicoStatus && (
          <Card className={`mb-6 p-4 border-l-4 ${aptoMedicoStatus.colorClass.replace('bg-', 'border-')}`}>
            <div className="flex items-center">
              {aptoMedicoStatus.status === 'Válido' && <ShieldCheck className={`h-6 w-6 mr-3 ${aptoMedicoStatus.colorClass.replace('bg-opacity-10', '').replace('bg-', 'text-')}`} />}
              {aptoMedicoStatus.status === 'Vencido' && <ShieldX className={`h-6 w-6 mr-3 ${aptoMedicoStatus.colorClass.replace('bg-opacity-10', '').replace('bg-', 'text-')}`} />}
              {['Pendiente', 'No Aplica', 'Sin datos', 'N/A', 'Inválido'].includes(aptoMedicoStatus.status) && <ShieldQuestion className={`h-6 w-6 mr-3 ${aptoMedicoStatus.colorClass.replace('bg-opacity-10', '').replace('bg-', 'text-')}`} />}
              <div>
                <p className={`font-bold ${aptoMedicoStatus.colorClass.replace('bg-opacity-10', '').replace('bg-', 'text-')}`}>
                  Apto Médico: {aptoMedicoStatus.status}
                </p>
                <p className="text-sm text-gray-600">{aptoMedicoStatus.message}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Banner de carga de imágenes */}
        {uploadStatus === 'loading' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg shadow-sm animate-pulse">
            <div className="flex items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-1">
                  Tus documentos se están cargando
                </h3>
                <p className="text-blue-700">
                  Estamos procesando tus imágenes de forma segura. Esto puede tomar unos momentos.
                  <br/>
                  <span className="text-sm text-blue-600">Puedes seguir navegando mientras tanto.</span>
                </p>
              </div>
              <div className="hidden md:block">
                <div className="bg-blue-100 rounded-full px-4 py-2">
                  <span className="text-blue-800 font-medium text-sm">En progreso...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner de carga completada */}
        {uploadStatus === 'complete' && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-6 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  ¡Perfil completado!
                </h3>
                <p className="text-green-700">
                  Tus documentos se han cargado exitosamente. Tu perfil está completo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Banner de error - necesita acción del usuario */}
        {uploadStatus === 'pending' && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-6 mb-6 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-1">
                  Completa tu perfil
                </h3>
                <p className="text-orange-700 mb-3">
                  Hubo un problema al cargar tus documentos. Por favor, súbelos manualmente para completar tu registro.
                </p>
                <button 
                  onClick={() => router.push('/dashboard/completar-perfil')}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Subir Documentos
                </button>
              </div>
            </div>
          </div>
        )}

        {socio.estadoSocio === 'Inactivo' && (
          <Alert variant="destructive" className="mb-8">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold">Tu cuenta se encuentra Inactiva</AlertTitle>
            <AlertDescription>
              <p className="font-semibold mt-2">Motivo:</p>
              <p>{socio.motivoInactivacion || "No se ha especificado un motivo. Por favor, contacta a la administración."}</p>
              <p className="mt-4 text-xs">Si no puedes resolver este problema, por favor contacta a la administración.</p>
            </AlertDescription>
          </Alert>
        )}

        <div>
          {showNovedades && novedades.length > 0 && (
            <Alert className="mb-8 relative bg-blue-50 border-blue-200 text-blue-800 shadow-md">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <AlertTitle className="font-bold text-blue-900">Novedades</AlertTitle>
              <AlertDescription>
                <div className="space-y-3 mt-2 pr-8">
                  {novedades.slice(0, 2).map((novedad) => (
                    <div key={novedad.id} className="text-sm">
                      <p className="font-semibold">{novedad.titulo}</p>
                      <p className="text-blue-700">{novedad.contenido}</p>
                    </div>
                  ))}
                </div>
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-blue-600 hover:bg-blue-100"
                onClick={() => setShowNovedades(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          <div className="mb-8"><h2 className="text-2xl font-bold text-gray-800 mb-2">Funcionalidades Disponibles</h2><p className="text-gray-600">Accede rápidamente a todas las herramientas de tu membresía</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funcionalidades.map((func) => {
              const Icon = func.icono;
              return (
                <Link key={func.id} href={func.href}>
                  <Card className="relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 hover:border-blue-300 overflow-hidden h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${func.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                    <CardContent className="p-6 relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${func.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}><Icon className="w-6 h-6 text-white" /></div>
                        {func.badge && <Badge className="bg-orange-500 text-white">{func.badge}</Badge>}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors">{func.titulo}</h3>
                      <p className="text-sm text-gray-600 mb-4">{func.descripcion}</p>
                      <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700"><span className="mr-2">Ir a {func.titulo}</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}