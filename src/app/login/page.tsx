import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Iniciar Sesión - ClubZenith',
  description: 'Inicia sesión en tu cuenta de ClubZenith.',
};

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoginForm />
    </div>
  );
}
