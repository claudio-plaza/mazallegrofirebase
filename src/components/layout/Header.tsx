'use client';

import Link from 'next/link';
import { siteConfig } from '@/config/site';
import Image from 'next/image';

// This Header is now only used for public-facing pages for users who are not logged in.
// The main navigation for logged-in users is handled by the new UserSidebar.
const Header = () => {
  return (
    <header className="bg-background/95 backdrop-blur-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image 
            src="/logo-largo.jpg"
            alt="Logo Mazallegro"
            data-ai-hint="company logo"
            width={100}
            height={50}
            className="h-auto" 
            priority 
          />
        </Link>
        {/* Navigation for public users is intentionally left out to keep the interface clean. 
            Login/Signup actions are prominent on the main page. */}
      </div>
    </header>
  );
};

export default Header;
