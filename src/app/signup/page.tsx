import { SignupForm } from '@/components/auth/SignupForm';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `Crear Cuenta - ${siteConfig.name}`,
  description: `Crea una nueva cuenta en ${siteConfig.name}.`,
};

export default function SignupPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <SignupForm />
    </div>
  );
}
