'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { suggestMemberUpdates, type SuggestMemberUpdatesOutput, type SuggestMemberUpdatesInput } from '@/ai/flows/suggest-member-updates';
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import type { Socio } from '@/types'; // To potentially show socio details if needed

export function AISuggestionsTool() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestMemberUpdatesOutput['suggestions'] | null>(null);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setSuggestions(null);

    try {
      const storedSocios = localStorage.getItem('sociosDB');
      if (!storedSocios) {
        toast({
          title: 'Error',
          description: 'No hay datos de socios en localStorage para analizar.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // For simplicity, we send all socio data. In a real app, this might be too large.
      // Consider sending only relevant fields or summaries.
      const memberDataString = storedSocios; 

      const input: SuggestMemberUpdatesInput = { memberData: memberDataString };
      const result = await suggestMemberUpdates(input);

      if (result && result.suggestions) {
        setSuggestions(result.suggestions);
        toast({
          title: 'Sugerencias Generadas',
          description: `Se encontraron ${result.suggestions.length} sugerencias.`,
        });
      } else {
        setSuggestions([]);
        toast({
          title: 'Sin Sugerencias',
          description: 'El AI no generó nuevas sugerencias esta vez.',
        });
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast({
        title: 'Error de AI',
        description: 'No se pudieron obtener las sugerencias del AI. Intente más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive" className="bg-red-500">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-orange-500 text-white">Media</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Baja</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };
  
  const getUpdateTypeIcon = (updateType: string) => {
    if (updateType.includes('medical_evaluation')) return <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />;
    if (updateType.includes('account_inactivity')) return <Info className="h-5 w-5 text-blue-500 mr-2" />;
    return <Sparkles className="h-5 w-5 text-primary mr-2" />;
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Sparkles className="mr-3 h-7 w-7 text-primary" />
          Herramienta de Sugerencias AI para Socios
        </CardTitle>
        <CardDescription>
          Utiliza inteligencia artificial para analizar datos de socios y obtener recomendaciones sobre posibles actualizaciones de estado, como evaluaciones médicas vencidas o inactividad de cuentas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button onClick={handleGetSuggestions} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Analizando Datos...' : 'Obtener Sugerencias de AI'}
        </Button>

        {suggestions !== null && (
          <div className="mt-6">
            {suggestions.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed rounded-md">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">¡Todo en orden!</p>
                <p className="text-muted-foreground">El AI no encontró sugerencias de actualización por el momento.</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-4">Sugerencias Encontradas:</h3>
                <Accordion type="single" collapsible className="w-full">
                  {suggestions.map((suggestion, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center">
                                {getUpdateTypeIcon(suggestion.updateType)}
                                <span className="font-medium text-left">Socio ID: {suggestion.memberId} - {suggestion.updateType.replace(/_/g, ' ')}</span>
                            </div>
                            {getUrgencyBadge(suggestion.urgency)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2 pb-4 space-y-1 bg-muted/30 rounded-b-md">
                        <p><strong>Razón:</strong> {suggestion.reason}</p>
                        <p><strong>Urgencia:</strong> {suggestion.urgency}</p>
                        <p><strong>Tipo de Actualización Sugerida:</strong> {suggestion.updateType}</p>
                        {/* Aquí se podrían agregar acciones, como "Ver Socio" o "Aplicar Sugerencia" */}
                        <Button size="sm" variant="outline" className="mt-2">
                            Ver Detalles del Socio (Próximamente)
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
