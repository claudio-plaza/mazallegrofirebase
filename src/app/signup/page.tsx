import { SignupForm } from '@/components/auth/SignupForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Crear Cuenta - ClubZenith',
  description: 'Crea una nueva cuenta en ClubZenith.',
};

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <SignupForm />
    </div>
  );
}
