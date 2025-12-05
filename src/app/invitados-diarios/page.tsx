'use client';

import { GestionInvitadosDiarios } from '@/components/invitados/GestionInvitadosDiarios';
import { SocioHeader } from '@/components/layout/SocioHeader';

export default function InvitadosDiariosPage() {
  return (
    <div className="container mx-auto py-8">
      <SocioHeader titulo="Cargar Invitados del Día" />
      <GestionInvitadosDiarios />
    </div>
  );
}