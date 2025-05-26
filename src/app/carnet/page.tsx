import { CarnetDigital } from '@/components/carnet/CarnetDigital';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Carnet Digital - ${siteConfig.name}`,
  description: `Visualiza tu carnet de socio digital de ${siteConfig.name}.`,
};

export default function CarnetPage() {
  return (
    <div className="container mx-auto py-8">
      <CarnetDigital />
    </div>
  );
}
