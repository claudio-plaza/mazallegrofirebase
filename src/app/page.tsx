import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LogIn, UserPlus } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Image
            src="/logo.png"
            alt="Logo Circular Mazallegro"
            width={100}
            height={100}
            className="mx-auto mb-4 rounded-full"
            data-ai-hint="club logo"
          />
          <Image
            src="/logo-largo.jpg"
            alt="Logo Mazallegro"
            data-ai-hint="company logo"
            width={153}
            height={76}
            className="mx-auto"
            priority
          />
          <div className="text-sm text-muted-foreground pt-2">
            Bienvenido al sistema de gestión de Allegro.
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-foreground">
            Accede a tu cuenta o crea una nueva para disfrutar de todos nuestros servicios.
          </p>
          <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
            <Link href="/login" className="flex-1">
              <Button className="w-full" variant="default">
                <LogIn className="mr-2 h-5 w-5" />
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/signup" className="flex-1">
              <Button className="w-full" variant="secondary">
                <UserPlus className="mr-2 h-5 w-5" />
                Crear Cuenta
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      <div className="mt-12 text-center max-w-2xl">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Descubre Allegro</h2>
        <p className="text-muted-foreground mb-6">
          Allegro es más que un club; es una comunidad. Nuestro sistema te permite gestionar tu membresía, acceder a información importante, y mantenerte conectado con todas las actividades del club.
        </p>
      </div>
    </div>
  );
}