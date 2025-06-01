
import { ConfiguracionPreciosForm } from '@/components/admin/ConfiguracionPreciosForm';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Configuración de Precios - ${siteConfig.name} Admin`,
  description: 'Establece los precios para las entradas de invitados.',
};

export default function ConfiguracionPreciosPage() {
  return (
    <div className="container mx-auto py-8">
      <ConfiguracionPreciosForm />
    </div>
  );
}
