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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { RevisionMedica, AptoMedicoInfo, TipoPersona, SolicitudInvitadosDiarios, Socio } from '@/types';
import { normalizeText, parseAnyDate } from '@/lib/helpers';
import { addDays, format, formatISO, parseISO, differenceInYears, isValid } from 'date-fns';
import { CheckCircle2, Search, XCircle, CalendarDays, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getSocio, addRevisionMedica, updateSocio, verificarIngresoHoy, getSolicitudInvitadosDiarios, addOrUpdateSolicitudInvitadosDiarios } from '@/lib/firebase/firestoreService';

const revisionSchema = z.object({
  fechaRevision: z.date({ required_error: 'La fecha de revisión es obligatoria.' }),
  resultado: z.enum(['Apto', 'No Apto'], { required_error: 'El resultado es obligatorio.' }),
  observaciones: z.string().optional(),
});

type RevisionFormValues = z.infer<typeof revisionSchema>;

export interface SearchedPerson {
  id: string; 
  dni: string; 
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
  personasSeleccionadasMultiple?: SearchedPerson[];
  bloquearBusqueda?: boolean;
}

export function NuevaRevisionDialog({
  onRevisionGuardada,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  personaPreseleccionada,
  personasSeleccionadasMultiple = [],
  bloquearBusqueda = false,
}: NuevaRevisionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchedPerson, setSearchedPerson] = useState<SearchedPerson | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const { user, userName: medicoName } = useAuth();
  const [isUnderThree, setIsUnderThree] = useState(false);
  const [isCheckingEntry, setIsCheckingEntry] = useState(false);
  const [hasEnteredToday, setHasEnteredToday] = useState<boolean | null>(null);

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: { fechaRevision: new Date(), resultado: undefined, observaciones: '' },
  });

  useEffect(() => {
    if (open) {
      if (personasSeleccionadasMultiple.length > 0) {
        setSearchedPerson(null);
        setSearchTerm(`${personasSeleccionadasMultiple.length} personas seleccionadas para revisión masiva`);
      } else if (personaPreseleccionada) {
        setSearchedPerson(personaPreseleccionada);
        setSearchTerm(`${personaPreseleccionada.nombreCompleto} (DNI: ${personaPreseleccionada.dni})`);
      } else {
        setSearchedPerson(null);
        setSearchTerm('');
      }
      setSearchMessage('');
      setHasEnteredToday(null);
      setIsCheckingEntry(false);
      form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
    }
  }, [open, personaPreseleccionada, personasSeleccionadasMultiple, form]);

  useEffect(() => {
    if (searchedPerson?.fechaNacimiento && isValid(searchedPerson.fechaNacimiento)) {
        setIsUnderThree(differenceInYears(new Date(), searchedPerson.fechaNacimiento) < 3);
    } else {
        setIsUnderThree(false);
    }

    if (searchedPerson) {
        setIsCheckingEntry(true);
        setHasEnteredToday(null);
        verificarIngresoHoy(searchedPerson.dni)
            .then(haIngresado => {
                setHasEnteredToday(haIngresado);
            })
            .catch(error => {
                console.error("Error verificando ingreso:", error);
                setHasEnteredToday(false); // Asumir que no ingresó si hay error
                toast({ title: "Error", description: "No se pudo verificar el ingreso de la persona.", variant: "destructive" });
            })
            .finally(() => {
                setIsCheckingEntry(false);
            });
    } else {
        setHasEnteredToday(null);
    }
  }, [searchedPerson, toast]);


  const handleSearchSocio = async () => {
    if (!searchTerm.trim()) { setSearchMessage('Ingrese un término de búsqueda.'); return; }
    setIsSearching(true);
    setSearchedPerson(null);
    setSearchMessage('');
    setHasEnteredToday(null);

    try {
      const functions = getFunctions();
      const searchSocio = httpsCallable(functions, 'searchSocio');
      const { data }: any = await searchSocio({ searchTerm: normalizeText(searchTerm.trim()) });
      const hit = data.results && data.results.length > 0 ? data.results[0] : null;

      if (hit) {
        const { objectID, type } = hit;
        let personFound: SearchedPerson | null = null;
        switch (type) {
          case 'Socio Titular': {
            const socio = await getSocio(objectID);
            if (socio) personFound = { id: socio.id, dni: socio.dni, nombreCompleto: `${socio.nombre} ${socio.apellido}`, fechaNacimiento: parseAnyDate(socio.fechaNacimiento)!, tipo: 'Socio Titular', socioTitularId: socio.id, aptoMedicoActual: socio.aptoMedico };
            break;
          }
          case 'Familiar':
          case 'Adherente': {
            const [titularId, personaDNI] = objectID.split('-');
            const socioTitular = await getSocio(titularId);
            if (socioTitular) {
              const persona = type === 'Familiar' ? socioTitular.familiares?.find(f => f.dni === personaDNI) : socioTitular.adherentes?.find(a => a.dni === personaDNI);
              if (persona) personFound = { id: persona.dni, dni: persona.dni, nombreCompleto: `${persona.nombre} ${persona.apellido}`, fechaNacimiento: parseAnyDate(persona.fechaNacimiento)!, tipo: type, socioTitularId: socioTitular.id, aptoMedicoActual: persona.aptoMedico };
            }
            break;
          }
          case 'Invitado Diario': {
            // objectID format: titularId-dni-fecha
            // Pero tenemos el socioTitularId explícito en el hit
            const titularId = hit.socioTitularId;
            const personaDNI = hit.dni;
            const fechaVisita = hit.fechaVisita;
            
            if (titularId && personaDNI) {
              personFound = { 
                id: personaDNI, 
                dni: personaDNI, 
                nombreCompleto: hit.nombreCompleto, 
                fechaNacimiento: parseAnyDate(hit.fechaNacimiento)!, 
                tipo: 'Invitado Diario', 
                socioTitularId: titularId, 
                aptoMedicoActual: hit.aptoMedico,
                fechaVisitaInvitado: fechaVisita ? parseISO(fechaVisita) : new Date()
              };
            }
            break;
          }
        }
        if (personFound) setSearchedPerson(personFound); else setSearchMessage('Persona no encontrada.');
      } else { setSearchMessage('Persona no encontrada.'); }
    } catch (error: any) { setSearchMessage(error.message || 'Ocurrió un error.');
    } finally { setIsSearching(false); }
  };

  const onSubmit = async (data: RevisionFormValues) => {
    const isBulk = personasSeleccionadasMultiple.length > 0;
    if (!isBulk && !searchedPerson) { toast({ title: 'Error', description: 'Debe seleccionar una persona.', variant: 'destructive' }); return; }
    if (!user) { toast({ title: 'Error', description: 'Debe estar autenticado.', variant: 'destructive' }); return; }
    
    const peopleToProcess = isBulk ? personasSeleccionadasMultiple : [searchedPerson!];
    const esApto = data.resultado === 'Apto';

    // Validar ingreso hoy (ahora también para masivos)
    if (isBulk) {
      // Para masivos, verificamos que todos hayan ingresado
      const ingresosPromises = peopleToProcess.map(p => verificarIngresoHoy(p.dni));
      const resultadosIngresos = await Promise.all(ingresosPromises);
      
      const indicesSinIngreso = resultadosIngresos
        .map((haIngresado, index) => haIngresado ? null : index)
        .filter((i): i is number => i !== null);

      if (indicesSinIngreso.length > 0) {
        const nombresSinIngreso = indicesSinIngreso
          .map(i => peopleToProcess[i].nombreCompleto)
          .join(', ');
        toast({ 
          title: 'Acción no permitida', 
          description: `Las siguientes personas no han registrado su ingreso hoy: ${nombresSinIngreso}. Deben ingresar antes de la revisión.`, 
          variant: 'destructive' 
        });
        return;
      }
    } else {
      // Individual
      if (!hasEnteredToday) { 
        toast({ title: 'Acción no permitida', description: 'La persona debe registrar su ingreso hoy para poder ser revisada.', variant: 'destructive' }); 
        return; 
      }
    }

    try {
      // 1. Agrupar personas por su Socio Titular para evitar race conditions
      const groupsByTitular: { [titularId: string]: SearchedPerson[] } = {};
      
      for (const p of peopleToProcess) {
        const titularId = p.tipo === 'Socio Titular' ? p.id : p.socioTitularId;
        if (!titularId) {
          console.error(`No se pudo identificar al socio titular para ${p.nombreCompleto}. Saltando.`);
          continue;
        }
        if (!groupsByTitular[titularId]) {
          groupsByTitular[titularId] = [];
        }
        groupsByTitular[titularId].push(p);
      }

      const promises: Promise<any>[] = [];
      
      // 2. Procesar cada grupo de forma consolidada
      for (const titularId in groupsByTitular) {
        const personsInGroup = groupsByTitular[titularId];
        
        // Log de revisiones (estos son documentos individuales, se pueden disparar en paralelo)
        for (const p of personsInGroup) {
          // Skip menores de 3 años en revisión individual
          if (!isBulk && differenceInYears(new Date(), p.fechaNacimiento) < 3) {
            toast({ title: 'Acción no permitida', description: `No se puede registrar revisión para menores de 3 años (${p.nombreCompleto}).`, variant: 'destructive' });
            continue;
          }

          const aptoData: AptoMedicoInfo = {
            valido: esApto,
            fechaEmision: data.fechaRevision,
            fechaVencimiento: esApto ? addDays(data.fechaRevision, 15) : undefined,
            observaciones: data.observaciones || '',
            ...(!esApto && { razonInvalidez: data.observaciones || 'No apto por revisión médica' }),
          };

          const revisionLog: Omit<RevisionMedica, 'id'> = {
            socioId: p.id,
            socioNombre: p.nombreCompleto,
            idSocioAnfitrion: titularId,
            tipoPersona: p.tipo,
            fechaRevision: data.fechaRevision,
            resultado: data.resultado,
            observaciones: data.observaciones || '',
            fechaVencimientoApto: aptoData.fechaVencimiento,
            medicoId: user.uid,
            medicoResponsable: medicoName || user.email || 'No identificado',
          };
          promises.push(addRevisionMedica(revisionLog));
        }

        // Tarea de actualización consolidada por SOCIO
        const updateTask = (async () => {
          const socioDoc = await getSocio(titularId);
          if (!socioDoc) return;

          let hasChanges = false;
          let updateObj: Partial<Socio> = {};

          // Datos comunes de aptitud
          const aptoData: AptoMedicoInfo = {
            valido: esApto,
            fechaEmision: data.fechaRevision,
            fechaVencimiento: esApto ? addDays(data.fechaRevision, 15) : undefined,
            observaciones: data.observaciones || '',
            ...(!esApto && { razonInvalidez: data.observaciones || 'No apto por revisión médica' }),
          };

          for (const p of personsInGroup) {
            if (p.tipo === 'Socio Titular') {
              updateObj.aptoMedico = aptoData;
              hasChanges = true;
            } else if (p.tipo === 'Familiar') {
              if (socioDoc.familiares) {
                // Actualizamos el array de familiares EN MEMORIA sobre el objeto que acabamos de bajar
                socioDoc.familiares = socioDoc.familiares.map(f =>
                  f.dni === p.dni ? { ...f, aptoMedico: aptoData } : f
                );
                updateObj.familiares = socioDoc.familiares;
                hasChanges = true;
              }
            } else if (p.tipo === 'Adherente') {
              if (socioDoc.adherentes) {
                socioDoc.adherentes = socioDoc.adherentes.map(a =>
                  a.dni === p.dni ? { ...a, aptoMedico: aptoData } : a
                );
                updateObj.adherentes = socioDoc.adherentes;
                hasChanges = true;
              }
            } else if (p.tipo === 'Invitado Diario') {
              // No procesamos aquí individualmente para evitar race conditions
              // Solo nos aseguramos de que el titularId esté en el loop para luego procesar por grupo
            }
          }

          // 3. Procesar Invitados Diarios por GRUPO para evitar race conditions
          const guestInGroup = personsInGroup.filter(p => p.tipo === 'Invitado Diario');
          if (guestInGroup.length > 0) {
            // Agrupar por fecha de visita si hubiera más de una (raro pero posible)
            const guestsByDate: { [fecha: string]: SearchedPerson[] } = {};
            guestInGroup.forEach(g => {
              const f = g.fechaVisitaInvitado ? formatISO(g.fechaVisitaInvitado, { representation: 'date' }) : formatISO(new Date(), { representation: 'date' });
              if (!guestsByDate[f]) guestsByDate[f] = [];
              guestsByDate[f].push(g);
            });

            for (const fechaISO in guestsByDate) {
              const guestsForThisDate = guestsByDate[fechaISO];
              let solicitud = await getSolicitudInvitadosDiarios(titularId, fechaISO);
              if (solicitud) {
                solicitud.listaInvitadosDiarios = solicitud.listaInvitadosDiarios.map(inv => {
                  const matchingPerson = guestsForThisDate.find(g => g.dni === inv.dni);
                  if (matchingPerson) {
                    return { ...inv, aptoMedico: aptoData };
                  }
                  return inv;
                });
                // Un solo guardado por lista
                await addOrUpdateSolicitudInvitadosDiarios(solicitud);
              }
            }
          }

          if (hasChanges) {
            await updateSocio(titularId, updateObj);
          }
        })();
        
        promises.push(updateTask);
      }

      await Promise.all(promises);

      toast({ 
          title: isBulk ? 'Revisiones Masivas Guardadas' : 'Revisión Guardada', 
          description: isBulk ? `Se procesaron ${peopleToProcess.length} personas correctamente.` : `El estado de ${searchedPerson?.nombreCompleto} ha sido actualizado.` 
      });
      onRevisionGuardada();
      onOpenChange(false);

    } catch (error: any) {
      console.error("Error guardando revisión:", error);
      toast({ title: "Error", description: `No se pudo guardar la revisión: ${error.message}`, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!personaPreseleccionada && (
        <DialogTrigger asChild><Button><CheckCircle2 className="mr-2 h-4 w-4" /> Nueva Revisión</Button></DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Revisión Médica</DialogTitle>
          <DialogDescription>
            {personasSeleccionadasMultiple.length > 0 
                ? `Registra el resultado para los ${personasSeleccionadasMultiple.length} miembros seleccionados. El apto será válido por 15 días.`
                : 'Busca una persona y registra el resultado. El apto será válido por 15 días.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Persona{personasSeleccionadasMultiple.length > 0 ? 's' : ''}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por DNI o Nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchSocio()}
                disabled={bloquearBusqueda || isSearching || personasSeleccionadasMultiple.length > 0}
                className="pl-10 h-11"
              />
            </div>
            {personasSeleccionadasMultiple.length > 0 && (
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border border-blue-100 mt-1">
                    Preparado para revisar: {personasSeleccionadasMultiple.map(p => p.nombreCompleto).join(', ')}
                </div>
            )}
            {!searchedPerson && searchMessage && <p className="text-sm text-muted-foreground mt-2">{searchMessage}</p>}
          </div>

          {searchedPerson && (
             <Card className="p-4 border-2 border-primary/20 bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-lg">{searchedPerson.nombreCompleto}</h4>
                        <p className="text-sm text-muted-foreground">DNI: {searchedPerson.dni} | {searchedPerson.tipo}</p>
                    </div>
                    {isUnderThree && <Badge variant="destructive" className="animate-pulse">Menor de 3 años</Badge>}
                </div>
             </Card>
          )}

          {!bloquearBusqueda && !searchedPerson && personasSeleccionadasMultiple.length === 0 && (
              <div className="py-10 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                  <Search className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Busca una persona para comenzar</p>
              </div>
          )}

          {(searchedPerson || personasSeleccionadasMultiple.length > 0) && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                 {personasSeleccionadasMultiple.length === 0 && (
                    <div className="border rounded-md p-4 space-y-3 bg-background shadow-sm">
                        <h5 className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary"/> Validación de Ingreso</h5>
                        <Alert className={hasEnteredToday === true ? "bg-green-50 border-green-200" : hasEnteredToday === false ? "bg-red-50 border-red-200" : "bg-muted/50"}>
                            <AlertDescription className="flex items-center justify-between">
                                <span className="text-xs">
                                    {isCheckingEntry ? "Verificando ingreso..." : 
                                     hasEnteredToday === true ? "Ingreso verificado hoy. Listo para revisión." : 
                                     hasEnteredToday === false ? "ERROR: Esta persona no ha registrado su ingreso hoy." : 
                                     "Inicie búsqueda para validar ingreso."}
                                </span>
                                {hasEnteredToday === true && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                {hasEnteredToday === false && <AlertTriangle className="h-4 w-4 text-red-600" />}
                            </AlertDescription>
                        </Alert>
                    </div>
                 )}
            <fieldset disabled={(!searchedPerson && personasSeleccionadasMultiple.length === 0) || (personasSeleccionadasMultiple.length === 0 && (isUnderThree || !hasEnteredToday || isCheckingEntry))} className="space-y-4">
              <FormField control={form.control} name="fechaRevision" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Revisión</FormLabel>
                  <FormControl><Input type="date" value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} onChange={e => field.onChange(parseISO(e.target.value))} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="resultado" render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Apto" id="apto" /></FormControl><Label htmlFor="apto">Apto</Label></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No Apto" id="no-apto" /></FormControl><Label htmlFor="no-apto">No Apto</Label></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="observaciones" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl><Textarea placeholder="Notas sobre la revisión..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </fieldset>
              </form>
            </Form>
          )}
        </div>
        <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button 
                type="submit" 
                onClick={form.handleSubmit(onSubmit)}
                disabled={(personasSeleccionadasMultiple.length === 0 && !searchedPerson) || form.formState.isSubmitting || (personasSeleccionadasMultiple.length === 0 && (!hasEnteredToday || isCheckingEntry))}
              >
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Revisión"}
              </Button>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
