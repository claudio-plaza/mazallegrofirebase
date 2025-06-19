
import { AdminNuevoSocioForm } from '@/components/admin/AdminNuevoSocioForm';
import { siteConfig } from '@/config/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Nuevo Socio - ${siteConfig.name} Admin`,
  description: 'Agrega un nuevo socio titular al club.',
};

export default function NuevoSocioPage() {
  return (
    <div className="container mx-auto py-8">
      <AdminNuevoSocioForm />
    </div>
  );
}
