import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Iniciar Sesión - ${siteConfig.name}`,
  description: `Inicia sesión en tu cuenta de ${siteConfig.name}.`,
};

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoginForm />
    </div>
  );
}
