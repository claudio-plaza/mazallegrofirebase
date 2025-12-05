'use client';

import { GestionAdherentesSocio } from '@/components/adherentes/GestionAdherentesSocio';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SocioHeader } from '@/components/layout/SocioHeader';

export default function MisAdherentesPage() {
  return (
    <div className="container mx-auto py-8">
      <SocioHeader titulo="Mis Adherentes" />
      <Card>
        <CardContent className="pt-6">
          <GestionAdherentesSocio />
        </CardContent>
      </Card>
    </div>
  );
}