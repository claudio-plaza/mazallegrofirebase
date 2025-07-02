
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import type { Socio, RevisionMedica, AptoMedicoInfo, Adherente, MiembroFamiliar, TipoPersona, SolicitudInvitadosDiarios } from '@/types';
import { formatDate, getAptoMedicoStatus, generateId } from '@/lib/helpers';
import { addDays, format, formatISO, parseISO, differenceInYears, isValid, subYears, isToday } from 'date-fns';
import { CheckCircle2, Search, User, XCircle, CalendarDays, Check, X, AlertTriangle, UserRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { siteConfig } from '@/config/site';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getSocios, getSocioByNumeroSocioOrDNI, addOrUpdateSolicitudInvitadosDiarios, getSolicitudInvitadosDiarios, addRevisionMedica, updateSocio, getAllSolicitudesInvitadosDiarios } from '@/lib/firebase/firestoreService';

const revisionSchema = z.object({
  fechaRevision: z.date({ required_error: 'La fecha de revisión es obligatoria.' }),
  resultado: z.enum(['Apto', 'No Apto'], { required_error: 'El resultado es obligatorio.' }),
  observaciones: z.string().optional(),
});

type RevisionFormValues = z.infer<typeof revisionSchema>;

export interface SearchedPerson {
  id: string; 
  nombreCompleto: string;
  fechaNacimiento: Date;
  tipo: TipoPersona;
  socioTitularId?: string; 
  aptoMedicoActual?: AptoMedicoInfo;
  fechaVisitaInvitado?: Date; 
}

interface NuevaRevisionDialogProps {
  onRevisionGuardada: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  personaPreseleccionada?: SearchedPerson | null;
  bloquearBusqueda?: boolean;
}

export function NuevaRevisionDialog({
  onRevisionGuardada,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  personaPreseleccionada,
  bloquearBusqueda = false
}: NuevaRevisionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPerson, setSearchedPerson] = useState<SearchedPerson | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const { toast } = useToast();
  const { userName: medicoName } = useAuth();
  const [isUnderThree, setIsUnderThree] = useState(false);
  const [maxRevisionDate, setMaxRevisionDate] = useState<string>('');
  const [minRevisionDate, setMinRevisionDate] = useState<string>('');

  useEffect(() => {
    setMaxRevisionDate(format(new Date(), 'yyyy-MM-dd'));
    setMinRevisionDate(format(subYears(new Date(), 1), 'yyyy-MM-dd'));
  }, []);

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      fechaRevision: new Date(),
      resultado: undefined,
      observaciones: '',
    },
  });

  useEffect(() => {
    if (searchedPerson?.fechaNacimiento) {
      if (isValid(searchedPerson.fechaNacimiento)) {
        const age = differenceInYears(new Date(), searchedPerson.fechaNacimiento);
        setIsUnderThree(age < 3);
      } else {
        setIsUnderThree(false);
      }
    } else {
      setIsUnderThree(false);
    }
  }, [searchedPerson]);

  useEffect(() => {
    if (open) {
      if (personaPreseleccionada) {
        setSearchedPerson(personaPreseleccionada);
        setSearchTerm(`${personaPreseleccionada.nombreCompleto} (DNI: ${personaPreseleccionada.id})`);
        setSearchMessage('');
        form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
      } else {
        form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
        setSearchedPerson(null);
        setSearchTerm('');
        setSearchMessage('');
        setIsUnderThree(false);
      }
    }
  }, [open, personaPreseleccionada, form]);


  const handleSearchSocio = async () => {
    if (!searchTerm.trim()) {
      setSearchMessage('Ingrese N° Socio, DNI, Nombre o Apellido.');
      setSearchedPerson(null);
      return;
    }
    
    let personFound: SearchedPerson | null = null;
    const term = searchTerm.trim().toLowerCase();
    
    const socioTitular = await getSocioByNumeroSocioOrDNI(term);
    if (socioTitular) {
        if (socioTitular.numeroSocio.toLowerCase() === term || socioTitular.dni.toLowerCase() === term || `${socioTitular.nombre.toLowerCase()} ${socioTitular.apellido.toLowerCase()}`.includes(term)) {
            personFound = {
                id: socioTitular.numeroSocio, 
                nombreCompleto: `${socioTitular.nombre} ${socioTitular.apellido}`,
                fechaNacimiento: socioTitular.fechaNacimiento,
                tipo: 'Socio Titular',
                aptoMedicoActual: socioTitular.aptoMedico
            };
        }
    }
    
    if (!personFound) {
        const allSociosArray = await getSocios();
        for (const socio of allSociosArray) {
            const familiarFound = socio.grupoFamiliar?.find(f => f.dni.toLowerCase() === term || `${f.nombre.toLowerCase()} ${f.apellido.toLowerCase()}`.includes(term));
            if (familiarFound) {
              personFound = {
                id: familiarFound.dni, 
                nombreCompleto: `${familiarFound.nombre} ${familiarFound.apellido}`,
                fechaNacimiento: familiarFound.fechaNacimiento,
                tipo: 'Familiar',
                socioTitularId: socio.numeroSocio,
                aptoMedicoActual: familiarFound.aptoMedico
              };
              break;
            }
            const adherenteFound = socio.adherentes?.find(a => a.dni.toLowerCase() === term || `${a.nombre.toLowerCase()} ${a.apellido.toLowerCase()}`.includes(term));
            if (adherenteFound) {
               personFound = {
                id: adherenteFound.dni, 
                nombreCompleto: `${adherenteFound.nombre} ${adherenteFound.apellido}`,
                fechaNacimiento: adherenteFound.fechaNacimiento,
                tipo: 'Adherente',
                socioTitularId: socio.numeroSocio,
                aptoMedicoActual: adherenteFound.aptoMedico
              };
              break;
            }
        }
    }

    if (!personFound) {
        const todasSolicitudes = await getAllSolicitudesInvitadosDiarios();
        const solicitudesHoy = todasSolicitudes.filter((sol: SolicitudInvitadosDiarios) => sol.fecha === formatISO(new Date(), { representation: 'date' }));
        
        for (const solicitud of solicitudesHoy) {
            const invitadoFound = solicitud.listaInvitadosDiarios.find(inv => 
                inv.dni.toLowerCase() === term || 
                `${inv.nombre.toLowerCase()} ${inv.apellido.toLowerCase()}`.includes(term)
            );
            if (invitadoFound) {
                personFound = {
                    id: invitadoFound.dni, 
                    nombreCompleto: `${invitadoFound.nombre} ${invitadoFound.apellido}`,
                    fechaNacimiento: invitadoFound.fechaNacimiento || new Date(0),
                    tipo: 'Invitado Diario',
                    socioTitularId: solicitud.idSocioTitular,
                    aptoMedicoActual: invitadoFound.aptoMedico || undefined,
                    fechaVisitaInvitado: parseISO(solicitud.fecha),
                };
                break;
            }
        }
    }

    if (personFound) {
      setSearchedPerson(personFound);
      setSearchMessage('');
      form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
    } else {
      setSearchedPerson(null);
      setSearchMessage('Persona no encontrada (Socio, Familiar, Adherente o Invitado Diario de hoy).');
    }
  };
  
  const onSubmit = async (data: RevisionFormValues) => {
    if (!searchedPerson) {
      toast({ title: 'Error', description: 'Debe seleccionar una persona.', variant: 'destructive' });
      return;
    }
    if (isUnderThree) {
      toast({ title: 'Acción no permitida', description: 'No se puede registrar revisión médica para menores de 3 años.', variant: 'destructive' });
      return;
    }

    const fechaRevisionSeleccionada = data.fechaRevision;
    const esApto = data.resultado === 'Apto';

    // 1. Define the new AptoMedicoInfo object to be saved in the person's profile
    const nuevoAptoMedico: Partial<AptoMedicoInfo> = {
        valido: esApto,
        fechaEmision: fechaRevisionSeleccionada,
        observaciones: data.observaciones,
    };

    if (esApto) {
        nuevoAptoMedico.fechaVencimiento = addDays(fechaRevisionSeleccionada, 14);
    } else {
        nuevoAptoMedico.razonInvalidez = 'No Apto según revisión médica.';
    }

    // 2. Define the historical RevisionMedica record
    const nuevaRevision: Omit<RevisionMedica, 'id'> = {
      fechaRevision: fechaRevisionSeleccionada,
      socioId: searchedPerson.id, 
      socioNombre: searchedPerson.nombreCompleto,
      tipoPersona: searchedPerson.tipo,
      resultado: data.resultado as 'Apto' | 'No Apto',
      observaciones: data.observaciones,
      medicoResponsable: medicoName || `Médico ${siteConfig.name}`,
    };
    if (esApto && nuevoAptoMedico.fechaVencimiento) {
        (nuevaRevision as RevisionMedica).fechaVencimientoApto = nuevoAptoMedico.fechaVencimiento;
    }
    if (searchedPerson.socioTitularId) {
        (nuevaRevision as RevisionMedica).idSocioAnfitrion = searchedPerson.socioTitularId;
    }


    try {
        // 3. Save the historical revision record
        await addRevisionMedica(nuevaRevision);
        
        // 4. Update the source-of-truth document with the new apto medico status
        switch (searchedPerson.tipo) {
            case 'Socio Titular': {
                const socioToUpdate = await getSocioByNumeroSocioOrDNI(searchedPerson.id);
                if (socioToUpdate) {
                    socioToUpdate.aptoMedico = nuevoAptoMedico as AptoMedicoInfo;
                    socioToUpdate.ultimaRevisionMedica = fechaRevisionSeleccionada;
                    await updateSocio(socioToUpdate);
                }
                break;
            }
            case 'Familiar': {
                if (!searchedPerson.socioTitularId) throw new Error("ID de socio titular no encontrado para familiar.");
                const socioAnfitrion = await getSocioByNumeroSocioOrDNI(searchedPerson.socioTitularId);
                if (socioAnfitrion && socioAnfitrion.grupoFamiliar) {
                    const familiarIndex = socioAnfitrion.grupoFamiliar.findIndex(f => f.dni === searchedPerson.id);
                    if (familiarIndex !== -1) {
                        socioAnfitrion.grupoFamiliar[familiarIndex].aptoMedico = nuevoAptoMedico as AptoMedicoInfo;
                        await updateSocio(socioAnfitrion);
                    }
                }
                break;
            }
            case 'Adherente': {
                if (!searchedPerson.socioTitularId) throw new Error("ID de socio titular no encontrado para adherente.");
                const socioAnfitrion = await getSocioByNumeroSocioOrDNI(searchedPerson.socioTitularId);
                if (socioAnfitrion && socioAnfitrion.adherentes) {
                    const adherenteIndex = socioAnfitrion.adherentes.findIndex(a => a.dni === searchedPerson.id);
                    if (adherenteIndex !== -1) {
                        socioAnfitrion.adherentes[adherenteIndex].aptoMedico = nuevoAptoMedico as AptoMedicoInfo;
                        await updateSocio(socioAnfitrion);
                    }
                }
                break;
            }
            case 'Invitado Diario': {
                if (!searchedPerson.socioTitularId || !searchedPerson.fechaVisitaInvitado) throw new Error("Faltan datos para actualizar invitado.");
                const fechaISO = formatISO(searchedPerson.fechaVisitaInvitado, { representation: 'date' });
                const solicitud = await getSolicitudInvitadosDiarios(searchedPerson.socioTitularId, fechaISO);
                if (solicitud) {
                    const invitadoIndex = solicitud.listaInvitadosDiarios.findIndex(i => i.dni === searchedPerson.id);
                    if (invitadoIndex !== -1) {
                        solicitud.listaInvitadosDiarios[invitadoIndex].aptoMedico = nuevoAptoMedico as AptoMedicoInfo;
                        await addOrUpdateSolicitudInvitadosDiarios(solicitud);
                    }
                }
                break;
            }
        }
        
        // 5. Success feedback and close
        toast({ title: 'Revisión Guardada y Estado Actualizado', description: `El estado de apto médico para ${searchedPerson.nombreCompleto} ha sido actualizado.` });
        onRevisionGuardada();
        form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
        setSearchedPerson(null);
        setSearchTerm('');
        onOpenChange(false);

    } catch (error) {
        console.error("Error guardando revisión o actualizando socio/invitado:", error);
        toast({ title: "Error", description: "No se pudo guardar la revisión o actualizar los datos de la persona.", variant: "destructive" });
    }
  };

  const currentPersonAptoStatus = searchedPerson ? getAptoMedicoStatus(searchedPerson.aptoMedicoActual, searchedPerson.fechaNacimiento) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!personaPreseleccionada && ( 
          <DialogTrigger asChild>
            <Button><CheckCircle2 className="mr-2 h-4 w-4" /> Nueva Revisión</Button>
          </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <CalendarDays className="mr-2 h-6 w-6 text-primary" />
            Registrar Nueva Revisión Médica
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Busca un socio, familiar, adherente o invitado diario (de hoy) y registra el resultado. El apto físico será válido por 15 días. Menores de 3 años no requieren revisión.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4 pb-2">
          {!bloquearBusqueda && (
            <div>
              <Label htmlFor="searchSocio" className="text-sm font-medium">Buscar Persona (N° Socio, DNI, Nombre o Apellido)</Label>
              <div className="flex gap-2 items-center mt-1">
                  <Input
                      id="searchSocio"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Ej: S00123, 30123456 o Juan Pérez"
                      className="flex-grow"
                  />
                  <Button onClick={handleSearchSocio} type="button" variant="outline" size="icon" className="shrink-0"><Search className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
          {searchMessage && !bloquearBusqueda && <p className="text-sm text-destructive">{searchMessage}</p>}

          {searchedPerson && (
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                {searchedPerson.tipo === 'Invitado Diario' ? <UserRound className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                <h4 className="font-semibold text-sm">{searchedPerson.nombreCompleto} ({searchedPerson.tipo})</h4>
              </div>
              {searchedPerson.tipo === 'Invitado Diario' && searchedPerson.socioTitularId && (
                <p className="text-xs text-muted-foreground">Anfitrión (Socio N°): {searchedPerson.socioTitularId}</p>
              )}
              {currentPersonAptoStatus && (
                <p className={`text-xs ${currentPersonAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`}>
                  Apto actual: {currentPersonAptoStatus.status} - {currentPersonAptoStatus.message}
                </p>
              )}
            </Card>
          )}
        </div>

        {isUnderThree && searchedPerson && (
          <Alert variant="default" className="bg-blue-500/10 border-blue-500/30 text-blue-700">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Menor de 3 Años</AlertTitle>
            <AlertDescription>
              {searchedPerson.nombreCompleto} es menor de 3 años. No se requiere ni se puede registrar una revisión médica.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isUnderThree || !searchedPerson}>
              <FormField
                control={form.control}
                name="fechaRevision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Fecha de Revisión</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                          onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                          max={maxRevisionDate}
                          min={minRevisionDate}
                          className="w-full pl-10"
                          disabled={!maxRevisionDate || !minRevisionDate}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resultado"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Resultado de la Revisión</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="Apto" id="apto" />
                          </FormControl>
                          <Label htmlFor="apto" className="font-normal flex items-center cursor-pointer">
                            <Check className="mr-1 h-4 w-4 text-green-600" />Apto
                          </Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="No Apto" id="no-apto"/>
                          </FormControl>
                          <Label htmlFor="no-apto" className="font-normal flex items-center cursor-pointer">
                            <X className="mr-1 h-4 w-4 text-red-600" />No Apto
                          </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Observaciones</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Añade notas sobre la revisión (ej: reposo deportivo por 7 días, apto con preexistencia X, etc.)"
                        {...field}
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            <DialogFooter className="pt-2">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={!searchedPerson || form.formState.isSubmitting || isUnderThree}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Revisión"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
