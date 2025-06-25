
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AISuggestionsPage() {
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="mr-2 h-6 w-6 text-orange-500" />
            Función Deshabilitada Temporalmente
          </CardTitle>
          <CardDescription>
            La herramienta de sugerencias por IA se encuentra en mantenimiento para mejorar su estabilidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Estamos trabajando para resolver los conflictos de dependencias y volver a habilitar esta función lo antes posible.
            Disculpe las molestias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
