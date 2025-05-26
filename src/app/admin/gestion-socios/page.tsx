import { GestionSociosDashboard } from '@/components/admin/GestionSociosDashboard';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Gestión de Socios - ${siteConfig.name} Admin`,
  description: 'Administra los socios del club, sus estados y aptos médicos.',
};

export default function AdminGestionSociosPage() {
  return (
    <div className="container mx-auto py-8">
      <GestionSociosDashboard />
    </div>
  );
}
