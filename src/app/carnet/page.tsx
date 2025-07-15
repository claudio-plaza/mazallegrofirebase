import { CarnetDigital } from '@/components/carnet/CarnetDigital';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: `Carnet Digital - ${siteConfig.name}`,
  description: `Visualiza tu carnet de socio digital de ${siteConfig.name}.`,
};

export default function CarnetPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div>Cargando carnet...</div>}>
        <CarnetDigital />
      </Suspense>
    </div>
  );
}
