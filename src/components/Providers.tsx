
'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecaptchaProvider } from '@/components/providers/RecaptchaProvider';

// The Firebase app is initialized in @/lib/firebase/config.ts
// This ensures it's available for all components.

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RecaptchaProvider>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </RecaptchaProvider>
    </QueryClientProvider>
  );
}
