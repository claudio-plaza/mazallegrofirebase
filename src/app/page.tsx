import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LogIn, UserPlus } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center text-white" // Apply full-screen background
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 70%), linear-gradient(to bottom, #0e4291, #ed771b)'
      }}
    >
      <div className="w-full max-w-sm mx-auto relative z-10 p-4"> {/* Added p-4 for inner content spacing */}
        {/* Single Logo in the middle */}
        <div className="mb-12 flex justify-center">
          <Image
            src="/logoblanco.mazaallegro.png" // Consistent logo with login page
            alt="MazAllegro Logo"
            width={250}
            height={100}
            priority
          />
        </div>

        {/* Card for login/signup options */}
        <Card className="w-full max-w-md shadow-xl bg-transparent text-white border-0"> {/* Added border-0 */}
          <CardHeader className="text-center">
            <div className="text-sm pt-2">
              Bienvenido al sistema de gestión de Allegro.
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center">
              Accede a tu cuenta o crea una nueva para disfrutar de todos nuestros servicios.
            </p>
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <Link href="/login" className="flex-1">
                <Button
                  className="w-full bg-[#ed771b] text-white hover:bg-[#ed771b]/90" // Orange button for Login
                  variant="default"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/signup" className="flex-1">
                <Button
                  className="w-full bg-[#0e4291] text-white hover:bg-[#0e4291]/90" // Blue button for Signup
                  variant="secondary"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Crear Cuenta
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        {/* Removed "Descubre Allegro" section */}
      </div>
    </div>
  );
}
