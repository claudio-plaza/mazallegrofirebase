import { GestionSolicitudesFamiliaresDashboard } from '@/components/admin/GestionSolicitudesFamiliaresDashboard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SolicitudesFamiliaresPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Cambios en Familiares</CardTitle>
          <CardDescription>
            Revisa, aprueba o rechaza las solicitudes de los socios para agregar o modificar miembros de su grupo familiar.
          </CardDescription>
        </CardHeader>
      </Card>
      <GestionSolicitudesFamiliaresDashboard />
    </div>
  );
}
