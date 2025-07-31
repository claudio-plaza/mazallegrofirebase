'use client';

import { useAuth } from '@/hooks/useAuth';
import type { Socio } from '@/types';
import { getSocioByNumeroSocioOrDNI } from '@/lib/firebase/firestoreService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, getAptoMedicoStatus } from '@/lib/helpers';
import { UserCircle, Users, Calendar, ShieldCheck, ShieldAlert, Mail, Phone, MapPin, Briefcase, LogInIcon, Info, UserSquare2, MailQuestion, XSquare, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { EstadoCambioGrupoFamiliar } from '@/types';


export function VistaPerfilSocio() {
  const { loggedInUserNumeroSocio, isLoading: authLoading } = useAuth();
  
  const { data: socio, isLoading: isSocioLoading } = useQuery({
    queryKey: ['socio', loggedInUserNumeroSocio],
    queryFn: () => getSocioByNumeroSocioOrDNI(loggedInUserNumeroSocio!),
    enabled: !!loggedInUserNumeroSocio && !authLoading,
  });

  const loading = authLoading || isSocioLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader className="items-center text-center p-6">
            <Skeleton className="h-28 w-28 rounded-full" />
            <Skeleton className="h-7 w-1/2 mt-4" />
            <Skeleton className="h-5 w-1/3 mt-2" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Separator className="my-4" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!socio) {
    return (
      <Card className="w-full max-w-lg mx-auto text-center py-10">
        <CardHeader>
          <UserCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
          <CardTitle>Error al Cargar Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No se pudo cargar la información de tu perfil. Por favor, intenta recargar la página o contacta a administración si el problema persiste.
          </p>
        </CardContent>
      </Card>
    );
  }

  const aptoStatusTitular = getAptoMedicoStatus(socio.aptoMedico, socio.fechaNacimiento);
  const fotoTitular = socio.fotoUrl || socio.fotoPerfil || `https://placehold.co/128x128.png`;


  const InfoItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string | null }) => (
    value ? (
        <div className="flex items-start space-x-3">
            <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
        </div>
    ) : null
  );

  const ProfileSection = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
    <section className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center text-primary mb-3">
            <Icon className="mr-2 h-5 w-5" /> {title}
        </h3>
        {children}
    </section>
  );


  return (
    <div className="space-y-8">
      <Card className="w-full max-w-4xl mx-auto shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/80 to-primary p-6 sm:p-8 text-primary-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg">
              <AvatarImage src={fotoTitular} alt={`${socio.nombre} ${socio.apellido}`} data-ai-hint="profile photo" />
              <AvatarFallback className="text-4xl bg-muted text-muted-foreground">
                {socio.nombre[0]}{socio.apellido[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <CardTitle className="text-3xl sm:text-4xl font-bold">{socio.nombre} {socio.apellido}</CardTitle>
              <CardDescription className="text-primary-foreground/80 text-base mt-1">
                Socio N°: {socio.numeroSocio} | DNI: {socio.dni}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 space-y-8">

            {socio.estadoCambioGrupoFamiliar === EstadoCambioGrupoFamiliar.PENDIENTE && (
                <Alert variant="default" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-700">
                    <MailQuestion className="h-5 w-5" />
                    <AlertTitle className="font-semibold">Solicitud Pendiente</AlertTitle>
                    <AlertDescription>
                        Tiene una solicitud de cambio para su grupo familiar pendiente de aprobación por la administración.
                    </AlertDescription>
                </Alert>
            )}
            {socio.estadoCambioGrupoFamiliar === EstadoCambioGrupoFamiliar.RECHAZADO && (
                 <Alert variant="destructive" className="mt-4">
                    <XSquare className="h-5 w-5" />
                    <AlertTitle className="font-semibold">Solicitud de Cambio Rechazada</AlertTitle>
                    <AlertDescription>
                        Su última solicitud de cambio de grupo familiar fue rechazada. Motivo: {socio.motivoRechazoCambioGrupoFamiliar || "No especificado"}.
                        Puede realizar una nueva solicitud desde &quot;Gestionar Grupo Familiar&quot;.
                    </AlertDescription>
                </Alert>
            )}

            <ProfileSection title="Información Personal" icon={UserCircle}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <InfoItem icon={Mail} label="Email" value={socio.email} />
                    <InfoItem icon={Phone} label="Teléfono" value={socio.telefono} />
                    <InfoItem icon={MapPin} label="Dirección" value={socio.direccion} />
                    <InfoItem icon={Calendar} label="Fecha de Nacimiento" value={formatDate(socio.fechaNacimiento)} />
                    <InfoItem icon={Briefcase} label="Empresa / Obra Social" value={socio.empresa || undefined} />
                    <InfoItem icon={LogInIcon} label="Miembro Desde" value={formatDate(socio.miembroDesde)} />
                </div>
            </ProfileSection>

            <Separator />

            <ProfileSection title="Estado de Membresía" icon={UserSquare2}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-4 bg-muted/30">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Estado del Socio</h4>
                        <Badge variant={socio.estadoSocio === 'Activo' ? 'default' : 'destructive'} className={`text-base ${socio.estadoSocio === 'Activo' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                            {socio.estadoSocio}
                        </Badge>
                    </Card>
                    <Card className={`p-4 border ${aptoStatusTitular.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 border-')}`}>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Apto Médico (Titular)</h4>
                         <div className="flex items-center">
                            {aptoStatusTitular.status === 'Válido' && <ShieldCheck className={`h-5 w-5 mr-2 ${aptoStatusTitular.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                            {(aptoStatusTitular.status === 'Vencido' || aptoStatusTitular.status === 'Inválido') && <ShieldAlert className={`h-5 w-5 mr-2 ${aptoStatusTitular.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                            {aptoStatusTitular.status === 'Pendiente' && <AlertTriangle className={`h-5 w-5 mr-2 ${aptoStatusTitular.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                            {aptoStatusTitular.status === 'No Aplica' && <Info className={`h-5 w-5 mr-2 ${aptoStatusTitular.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                            <Badge
                                variant="outline"
                                className={cn(
                                    "text-sm",
                                    aptoStatusTitular.status === 'Válido' ? "text-green-700" :
                                    (aptoStatusTitular.status === 'Vencido' || aptoStatusTitular.status === 'Inválido') ? "text-red-700" :
                                    aptoStatusTitular.status === 'Pendiente' ? "text-yellow-700" :
                                    aptoStatusTitular.status === 'No Aplica' ? "text-gray-700" :
                                    "text-foreground",
                                    aptoStatusTitular.colorClass.includes('green') && "border-green-500",
                                    aptoStatusTitular.colorClass.includes('orange') && "border-orange-500",
                                    aptoStatusTitular.colorClass.includes('red') && "border-red-500",
                                    aptoStatusTitular.colorClass.includes('yellow') && "border-yellow-500",
                                    aptoStatusTitular.colorClass.includes('gray') && "border-gray-500"
                                )}
                            >
                                {aptoStatusTitular.status}
                            </Badge>
                        </div>
                        <p className={`text-xs mt-1 ${aptoStatusTitular.colorClass.replace('bg-', 'text-').replace('-100', '-600')}`}>{aptoStatusTitular.message}</p>
                         {socio.ultimaRevisionMedica && (
                            <p className="text-xs text-muted-foreground mt-1">Última Revisión: {formatDate(socio.ultimaRevisionMedica)}</p>
                        )}
                    </Card>
                </div>
            </ProfileSection>

            {socio.grupoFamiliar && socio.grupoFamiliar.length > 0 && (
                <>
                <Separator />
                <ProfileSection title="Grupo Familiar Aprobado" icon={Users}>
                    <Accordion type="multiple" className="w-full">
                    {socio.grupoFamiliar.map((familiar, index) => {
                        const aptoStatusFamiliar = getAptoMedicoStatus(familiar.aptoMedico, familiar.fechaNacimiento);
                        const fotoFamiliar = familiar.fotoPerfil || `https://placehold.co/96x96.png`;
                        return (
                        <AccordionItem value={`familiar-${index}`} key={familiar.dni || index}>
                            <AccordionTrigger className="hover:bg-muted/50 px-4 py-3 rounded-md">
                                <div className="flex items-center space-x-3">
                                    <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={fotoFamiliar} alt={familiar.nombre} data-ai-hint="family member photo"/>
                                        <AvatarFallback>{familiar.nombre[0]}{familiar.apellido[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-foreground">{familiar.nombre} {familiar.apellido}</p>
                                        <p className="text-xs text-muted-foreground">{familiar.relacion} - DNI: {familiar.dni}</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pt-3 pb-4 space-y-3 bg-muted/20 rounded-b-md">
                                <InfoItem icon={Calendar} label="Fecha de Nacimiento" value={formatDate(familiar.fechaNacimiento as unknown as string)} />
                                {familiar.email && <InfoItem icon={Mail} label="Email" value={familiar.email} />}
                                {familiar.telefono && <InfoItem icon={Phone} label="Teléfono" value={familiar.telefono} />}
                                <Card className={`p-3 border ${aptoStatusFamiliar.colorClass.replace('text-', 'text-').replace('bg-', 'bg-opacity-10 border-')}`}>
                                    <h5 className="text-xs font-medium text-muted-foreground mb-1">Apto Médico</h5>
                                    <div className="flex items-center">
                                        {aptoStatusFamiliar.status === 'Válido' && <ShieldCheck className={`h-4 w-4 mr-1.5 ${aptoStatusFamiliar.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                                        {(aptoStatusFamiliar.status === 'Vencido' || aptoStatusFamiliar.status === 'Inválido') && <ShieldAlert className={`h-4 w-4 mr-1.5 ${aptoStatusFamiliar.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                                        {aptoStatusFamiliar.status === 'Pendiente' && <AlertTriangle className={`h-4 w-4 mr-1.5 ${aptoStatusFamiliar.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                                        {aptoStatusFamiliar.status === 'No Aplica' && <Info className={`h-4 w-4 mr-1.5 ${aptoStatusFamiliar.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`} />}
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-xs",
                                                aptoStatusFamiliar.status === 'Válido' ? "text-green-700" :
                                                (aptoStatusFamiliar.status === 'Vencido' || aptoStatusFamiliar.status === 'Inválido') ? "text-red-700" :
                                                aptoStatusFamiliar.status === 'Pendiente' ? "text-yellow-700" :
                                                aptoStatusFamiliar.status === 'No Aplica' ? "text-gray-700" :
                                                "text-foreground",
                                                aptoStatusFamiliar.colorClass.includes('green') && "border-green-500",
                                                aptoStatusFamiliar.colorClass.includes('orange') && "border-orange-500",
                                                aptoStatusFamiliar.colorClass.includes('red') && "border-red-500",
                                                aptoStatusFamiliar.colorClass.includes('yellow') && "border-yellow-500",
                                                aptoStatusFamiliar.colorClass.includes('gray') && "border-gray-500"
                                            )}
                                        >
                                            {aptoStatusFamiliar.status}
                                        </Badge>
                                    </div>
                                    <p className={`text-xs mt-0.5 ${aptoStatusFamiliar.colorClass.replace('bg-', 'text-').replace('-100', '-600')}`}>{aptoStatusFamiliar.message}</p>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>
                        );
                    })}
                    </Accordion>
                </ProfileSection>
                </>
            )}

            <Separator />
            <div className="text-center pt-4">
                 <Link href="/perfil" passHref>
                    <Button variant="secondary" size="lg">
                        <Users className="mr-2 h-5 w-5" /> Gestionar Grupo Familiar
                    </Button>
                </Link>
            </div>

             <Alert variant="default" className="mt-6">
                <Info className="h-5 w-5" />
                <AlertTitle>Información Importante</AlertTitle>
                <AlertDescription>
                    Para modificar tus datos personales (nombre, DNI, email, foto de perfil, etc.) o los de tus familiares ya aprobados, por favor, contacta a la administración del club.
                    Puedes proponer cambios a tu grupo familiar (agregar/quitar miembros o modificar datos de miembros aún no validados) desde el botón &quot;Gestionar Grupo Familiar&quot;. Estos cambios requerirán aprobación.
                </AlertDescription>
            </Alert>

        </CardContent>
      </Card>
    </div>
  );
}
