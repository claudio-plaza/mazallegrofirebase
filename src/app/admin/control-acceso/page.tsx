import { ControlAcceso } from '@/components/acceso/ControlAcceso';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Control de Acceso - ${siteConfig.name}`,
  description: 'Verifica el estado de los socios para el ingreso al club.',
};

export default function ControlAccesoPage() {
  return (
    <div className="container mx-auto py-8">
      <ControlAcceso />
    </div>
  );
}
