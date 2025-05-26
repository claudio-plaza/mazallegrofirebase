import { PanelMedicoDashboard } from '@/components/medico/PanelMedicoDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Panel Médico - ClubZenith',
  description: 'Gestiona revisiones médicas y aptos físicos de los socios.',
};

export default function MedicoPanelPage() {
  return (
    <div className="container mx-auto py-8">
      <PanelMedicoDashboard />
    </div>
  );
}
