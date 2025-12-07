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
import type { RevisionMedica, AptoMedicoInfo, TipoPersona, SolicitudInvitadosDiarios } from '@/types';
import { normalizeText, parseAnyDate } from '@/lib/helpers';
import { addDays, format, formatISO, parseISO, differenceInYears, isValid } from 'date-fns';
import { CheckCircle2, Search, XCircle, CalendarDays, AlertTriangle } from 'lucide-react';
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
  bloquearBusqueda?: boolean;
}

export function NuevaRevisionDialog({
  onRevisionGuardada,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  personaPreseleccionada,
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
      if (personaPreseleccionada) {
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
  }, [open, personaPreseleccionada, form]);

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
        }
        if (personFound) setSearchedPerson(personFound); else setSearchMessage('Persona no encontrada.');
      } else { setSearchMessage('Persona no encontrada.'); }
    } catch (error: any) { setSearchMessage(error.message || 'Ocurrió un error.');
    } finally { setIsSearching(false); }
  };

  const onSubmit = async (data: RevisionFormValues) => {
    if (!searchedPerson || !user) { toast({ title: 'Error', description: 'Debe seleccionar una persona y estar autenticado.', variant: 'destructive' }); return; }
    if (isUnderThree) { toast({ title: 'Acción no permitida', description: 'No se puede registrar revisión para menores de 3 años.', variant: 'destructive' }); return; }
    if (!hasEnteredToday) { toast({ title: 'Acción no permitida', description: 'La persona debe registrar su ingreso hoy para poder ser revisada.', variant: 'destructive' }); return; }

    const esApto = data.resultado === 'Apto';
    const titularId = searchedPerson.tipo === 'Socio Titular' ? searchedPerson.id : searchedPerson.socioTitularId;

    if (!titularId) {
      toast({ title: "Error Crítico", description: "No se pudo identificar al socio titular para esta persona.", variant: "destructive" });
      return;
    }

    const aptoDataPrincipal: AptoMedicoInfo = {
      valido: esApto,
      fechaEmision: data.fechaRevision,
      fechaVencimiento: esApto ? addDays(data.fechaRevision, 15) : undefined,
      ...(!esApto && { razonInvalidez: data.observaciones || 'No apto por revisión médica' }),
    };

    const revisionLog: Omit<RevisionMedica, 'id'> = {
      socioId: searchedPerson.id,
      socioNombre: searchedPerson.nombreCompleto,
      idSocioAnfitrion: titularId,
      tipoPersona: searchedPerson.tipo,
      fechaRevision: data.fechaRevision,
      resultado: data.resultado,
      observaciones: data.observaciones || '',
      fechaVencimientoApto: aptoDataPrincipal.fechaVencimiento,
      medicoId: user.uid,
      medicoResponsable: medicoName || user.email || 'No identificado',
    };

    try {
      const promises = [];
      promises.push(addRevisionMedica(revisionLog));
      const updateSocioPromise = (async () => {
        if (searchedPerson.tipo === 'Socio Titular') {
          await updateSocio(titularId, { aptoMedico: aptoDataPrincipal });
        } else {
          const socioDoc = await getSocio(titularId);
          if (!socioDoc) throw new Error("No se encontró el documento del socio titular para actualizar.");

          if (searchedPerson.tipo === 'Familiar' && socioDoc.familiares) {
            const familiaresActualizados = socioDoc.familiares.map(f =>
              f.dni === searchedPerson.dni ? { ...f, aptoMedico: aptoDataPrincipal } : f
            );
            await updateSocio(titularId, { familiares: familiaresActualizados });
                    } else if (searchedPerson.tipo === 'Adherente' && socioDoc.adherentes) {
                      const adherentesActualizados = socioDoc.adherentes.map(a =>
                        a.dni === searchedPerson.dni ? { ...a, aptoMedico: aptoDataPrincipal } : a
                      );
                      await updateSocio(titularId, { adherentes: adherentesActualizados });
                    } else if (searchedPerson.tipo === 'Invitado Diario') {
                      if (!searchedPerson.socioTitularId || !searchedPerson.fechaVisitaInvitado) {
                          throw new Error("Faltan datos del socio titular o fecha de visita para invitado diario.");
                      }
                      const fechaVisitaISO = formatISO(searchedPerson.fechaVisitaInvitado, { representation: 'date' });
                      let solicitud = await getSolicitudInvitadosDiarios(searchedPerson.socioTitularId, fechaVisitaISO);
          
                      if (!solicitud) {
                          throw new Error("No se encontró la solicitud de invitados para este día.");
                      }
          
                      const invitadosActualizados = solicitud.listaInvitadosDiarios.map(inv =>
                          inv.dni === searchedPerson.dni ? { ...inv, aptoMedico: aptoDataPrincipal } : inv
                      );
                      solicitud.listaInvitadosDiarios = invitadosActualizados;
                      await addOrUpdateSolicitudInvitadosDiarios(solicitud);
                    }
                  }
                })();
                
                promises.push(updateSocioPromise);
      await Promise.all(promises);

      toast({ title: 'Revisión Guardada', description: `El estado de apto médico para ${searchedPerson.nombreCompleto} ha sido actualizado.` });
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
          <DialogDescription>Busca una persona y registra el resultado. El apto será válido por 15 días.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!bloquearBusqueda && (
            <div className="flex gap-2 items-center">
              <Input id="searchSocio" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por N° Socio, DNI, Nombre..." />
              <Button onClick={handleSearchSocio} type="button" variant="outline" size="icon" disabled={isSearching}>{isSearching ? <Skeleton className="h-4 w-4" /> : <Search className="h-4 w-4" />}</Button>
            </div>
          )}
          {searchMessage && !bloquearBusqueda && <p className="text-sm text-center text-muted-foreground">{searchMessage}</p>}
          {searchedPerson && <Card className="p-3 bg-muted/30"><div className="font-semibold text-sm">{searchedPerson.nombreCompleto} ({searchedPerson.tipo})</div></Card>}
        </div>

        {isUnderThree && searchedPerson && (
          <Alert variant="default" className="bg-blue-100 border-blue-200 text-blue-700">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription>Esta persona es menor de 3 años y no requiere revisión médica.</AlertDescription>
          </Alert>
        )}

        {isCheckingEntry && <p className="text-sm text-center text-muted-foreground">Verificando ingreso...</p>}

        {hasEnteredToday === false && searchedPerson && !isUnderThree && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Esta persona no ha registrado su ingreso al club el día de hoy. No se puede realizar la revisión médica.
                </AlertDescription>
            </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset disabled={isUnderThree || !searchedPerson || !hasEnteredToday || isCheckingEntry} className="space-y-4">
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
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={!searchedPerson || form.formState.isSubmitting || !hasEnteredToday || isCheckingEntry}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar Revisión"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
