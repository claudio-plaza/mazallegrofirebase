import { LoginForm } from '@/components/auth/LoginForm';
import { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: `Iniciar Sesión - ${siteConfig.name}`,
  description: `Inicia sesión en tu cuenta de ${siteConfig.name}.`,
};

export default function LoginPage() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-white"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.15) 0%, transparent 70%), linear-gradient(to bottom, #0e4291, #ed771b)'
      }}
    >
      <div className="w-full max-w-sm mx-auto relative z-10"> {/* Added relative z-10 */}
        <div className="mb-12 flex justify-center">
          <Image
            src="/logoblanco.mazaallegro.png"
            alt="MazAllegro Logo"
            width={250}
            height={100}
            priority
          />
        </div>
        
        {/* El componente LoginForm se encarga del formulario y el botón "Iniciar Sesión" */}
        <LoginForm />

        <div className="mt-6 text-center">
            <Link href="/signup" className="inline-block w-full bg-[#005A9C] text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-blue-800 transition-colors duration-300">
            Crear cuenta
            </Link>
        </div>
      </div>
    </div>
  );
}
