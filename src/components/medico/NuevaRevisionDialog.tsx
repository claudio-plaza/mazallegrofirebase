
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
import type { Socio, RevisionMedica, AptoMedicoInfo } from '@/types';
import { formatDate, getAptoMedicoStatus, generateId } from '@/lib/helpers';
import { addDays, format, formatISO, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Search, User, XCircle, CalendarDays, Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Label } from '@/components/ui/label'; 
import { Card } from '@/components/ui/card'; 
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from "@/lib/utils";
import { siteConfig } from '@/config/site';

const revisionSchema = z.object({
  fechaRevision: z.date({ required_error: 'La fecha de revisión es obligatoria.' }),
  resultado: z.enum(['Apto', 'No Apto'], { required_error: 'El resultado es obligatorio.' }),
  observaciones: z.string().optional(),
});

type RevisionFormValues = z.infer<typeof revisionSchema>;

interface NuevaRevisionDialogProps {
  onRevisionGuardada: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NuevaRevisionDialog({ onRevisionGuardada, open: controlledOpen, onOpenChange: controlledOnOpenChange }: NuevaRevisionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const [searchTerm, setSearchTerm] = useState('');
  const [searchedSocio, setSearchedSocio] = useState<Socio | null>(null);
  const [searchMessage, setSearchMessage] = useState('');
  const { toast } = useToast();
  const { userName: medicoName } = useAuth(); 

  const form = useForm<RevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: {
      fechaRevision: new Date(),
      resultado: undefined,
      observaciones: '',
    },
  });

  const handleSearchSocio = () => {
    if (!searchTerm.trim()) {
      setSearchMessage('Ingrese un N° Socio o DNI.');
      setSearchedSocio(null);
      return;
    }
    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      const socios: Socio[] = JSON.parse(storedSocios);
      const socioFound = socios.find(s => s.numeroSocio === searchTerm.trim() || s.dni === searchTerm.trim());
      if (socioFound) {
        setSearchedSocio(socioFound);
        setSearchMessage('');
      } else {
        setSearchedSocio(null);
        setSearchMessage('Socio no encontrado.');
      }
    } else {
      setSearchedSocio(null);
      setSearchMessage('No hay socios en la base de datos local.');
    }
  };
  
  const onSubmit = (data: RevisionFormValues) => {
    if (!searchedSocio) {
      toast({ title: 'Error', description: 'Debe seleccionar un socio.', variant: 'destructive' });
      return;
    }

    const nuevaRevision: RevisionMedica = {
      id: generateId(),
      fechaRevision: formatISO(data.fechaRevision),
      socioId: searchedSocio.numeroSocio,
      socioNombre: `${searchedSocio.nombre} ${searchedSocio.apellido}`,
      resultado: data.resultado as 'Apto' | 'No Apto',
      observaciones: data.observaciones,
      medicoResponsable: medicoName || `Médico ${siteConfig.name}`,
    };

    const aptoMedicoUpdate: AptoMedicoInfo = {
      valido: data.resultado === 'Apto',
      fechaEmision: formatISO(data.fechaRevision),
      observaciones: data.observaciones,
    };

    if (data.resultado === 'Apto') {
      // Válido por 15 días, incluyendo el día de la revisión. Se guarda el último día de validez.
      aptoMedicoUpdate.fechaVencimiento = formatISO(addDays(data.fechaRevision, 14)); 
      nuevaRevision.fechaVencimientoApto = aptoMedicoUpdate.fechaVencimiento;
    } else {
       aptoMedicoUpdate.razonInvalidez = 'No Apto según última revisión';
       aptoMedicoUpdate.fechaVencimiento = undefined; 
    }

    const storedSocios = localStorage.getItem('sociosDB');
    if (storedSocios) {
      let socios: Socio[] = JSON.parse(storedSocios);
      socios = socios.map(s => 
        s.id === searchedSocio.id 
        ? { ...s, aptoMedico: aptoMedicoUpdate, ultimaRevisionMedica: formatISO(data.fechaRevision) } 
        : s
      );
      localStorage.setItem('sociosDB', JSON.stringify(socios));
    }

    const storedRevisiones = localStorage.getItem('revisionesDB');
    let revisiones: RevisionMedica[] = storedRevisiones ? JSON.parse(storedRevisiones) : [];
    revisiones.unshift(nuevaRevision); 
    localStorage.setItem('revisionesDB', JSON.stringify(revisiones));
    
    window.dispatchEvent(new Event('sociosDBUpdated'));
    toast({ title: 'Revisión Guardada', description: `La revisión para ${searchedSocio.nombre} ${searchedSocio.apellido} ha sido guardada.` });
    onRevisionGuardada();
    form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
    setSearchedSocio(null);
    setSearchTerm('');
    onOpenChange(false);
  };

  const currentSocioAptoStatus = searchedSocio ? getAptoMedicoStatus(searchedSocio.aptoMedico) : null;

  useEffect(() => {
    if (!open) {
      form.reset({ fechaRevision: new Date(), resultado: undefined, observaciones: '' });
      setSearchedSocio(null);
      setSearchTerm('');
      setSearchMessage('');
    }
  }, [open, form]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><CheckCircle2 className="mr-2 h-4 w-4" /> Nueva Revisión</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <CalendarDays className="mr-2 h-6 w-6 text-primary" />
            Registrar Nueva Revisión Médica
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Busca un socio y registra el resultado. El apto físico será válido por 15 días, incluyendo el día de la revisión. Se registrará el último día de validez.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4 pb-2">
          <div>
            <Label htmlFor="searchSocio" className="text-sm font-medium">Buscar Socio (N° Socio o DNI)</Label>
            <div className="flex gap-2 items-center mt-1">
                <Input 
                    id="searchSocio" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Ej: S00123 o 30123456"
                    className="flex-grow"
                />
                <Button onClick={handleSearchSocio} type="button" variant="outline" size="icon" className="shrink-0"><Search className="h-4 w-4" /></Button>
            </div>
          </div>
          {searchMessage && <p className="text-sm text-destructive">{searchMessage}</p>}

          {searchedSocio && (
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">{searchedSocio.nombre} {searchedSocio.apellido} (N°: {searchedSocio.numeroSocio})</h4>
              </div>
              {currentSocioAptoStatus && (
                <p className={`text-xs ${currentSocioAptoStatus.colorClass.replace('bg-', 'text-').replace('-100', '-500')}`}>
                  Apto actual: {currentSocioAptoStatus.status} - {currentSocioAptoStatus.message}
                </p>
              )}
            </Card>
          )}
        </div>

        {searchedSocio && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fechaRevision"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-medium">Fecha de Revisión</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal text-muted-foreground",
                              !field.value && "text-muted-foreground",
                              field.value && "text-foreground"
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: es })
                            ) : (
                              <span>Seleccione fecha</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          locale={es}
                          captionLayout="dropdown-buttons"
                          fromYear={new Date().getFullYear() - 100}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
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
              <DialogFooter className="pt-2">
                <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={!searchedSocio || form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Guardando..." : "Guardar Revisión"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
         {!searchedSocio && <DialogFooter className="pt-2"><DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose></DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
