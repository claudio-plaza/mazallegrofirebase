import { CarnetDigital } from '@/components/carnet/CarnetDigital';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carnet Digital - ClubZenith',
  description: 'Visualiza tu carnet de socio digital de ClubZenith.',
};

export default function CarnetPage() {
  return (
    <div className="container mx-auto py-8">
      <CarnetDigital />
    </div>
  );
}
