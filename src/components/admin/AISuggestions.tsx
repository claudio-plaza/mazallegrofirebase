
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSocios } from '@/lib/firebase/firestoreService';
import { suggestMemberUpdates, type Suggestion } from '@/ai/flows/suggest-member-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, AlertTriangle, Lightbulb, UserCheck, ShieldAlert } from 'lucide-react';
import type { Socio } from '@/types';
import Link from 'next/link';

export function AISuggestionsTool() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const { data: socios = [], isLoading: isLoadingSocios } = useQuery<Socio[]>({
    queryKey: ['socios'],
    queryFn: getSocios,
  });

  const { mutate: generateSuggestions, isPending: isGenerating } = useMutation({
    mutationFn: (sociosData: Socio[]) => suggestMemberUpdates({ socios: sociosData }),
    onSuccess: (data) => {
      setSuggestions(data.suggestions);
    },
    onError: (error) => {
      console.error("Error generating suggestions:", error);
      setSuggestions([]); // Clear previous suggestions on error
    },
  });

  const handleGenerateClick = () => {
    if (socios.length > 0) {
      generateSuggestions(socios);
    }
  };
  
  const getUrgencyBadge = (urgency: Suggestion['urgency']) => {
    switch (urgency) {
      case 'Alta':
        return <Badge variant="destructive">Urgencia Alta</Badge>;
      case 'Media':
        return <Badge variant="secondary" className="bg-orange-500 text-white hover:bg-orange-600">Urgencia Media</Badge>;
      case 'Baja':
        return <Badge variant="outline">Urgencia Baja</Badge>;
      default:
        return <Badge variant="outline">{urgency}</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Sparkles className="mr-3 h-7 w-7 text-primary" />
          Herramienta de Sugerencias con IA
        </CardTitle>
        <CardDescription>
          Analiza el estado de todos los socios para identificar posibles acciones administrativas, como aptos médicos vencidos o socios inactivos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-muted/50 rounded-lg text-center">
          <Button onClick={handleGenerateClick} disabled={isLoadingSocios || isGenerating}>
            {isGenerating ? 'Analizando...' : `Analizar ${socios.length} Socios`}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            El análisis puede tardar unos segundos. Se enviarán los datos de los socios para su procesamiento.
          </p>
        </div>

        {isGenerating && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Generando sugerencias...</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          </div>
        )}

        {!isGenerating && suggestions.length === 0 && (
          <div className="text-center py-8 px-6 border border-dashed rounded-md">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-medium text-foreground">Listo para analizar</p>
            <p className="text-muted-foreground mt-1">Presiona el botón para obtener sugerencias sobre la gestión de socios.</p>
          </div>
        )}

        {!isGenerating && suggestions.length > 0 && (
          <div className="space-y-4">
             <h3 className="text-xl font-semibold">Sugerencias Generadas ({suggestions.length})</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((suggestion) => (
                    <Card key={suggestion.memberId} className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start gap-2">
                               <CardTitle className="text-lg">{suggestion.memberName}</CardTitle>
                               {getUrgencyBadge(suggestion.urgency)}
                            </div>
                             <p className="text-xs text-muted-foreground">Socio N°: {suggestion.memberId}</p>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2">
                            <p className="text-sm">
                                <strong className="text-primary">Acción sugerida:</strong> {suggestion.updateType}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <strong className="font-medium text-foreground">Razón:</strong> {suggestion.reason}
                            </p>
                        </CardContent>
                        <CardFooter>
                           <Link href={`/admin/socios/${suggestion.memberId}/editar`} passHref>
                              <Button variant="outline" size="sm">
                                <UserCheck className="mr-2 h-4 w-4" />
                                Ir al Perfil del Socio
                              </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
