'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileCheck, MessageCircle } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-beoe-primary text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-2xl">🇵🇰</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">BEOE Document Validator</h1>
              <p className="text-sm text-green-200">Travel Document Verification System</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-2 sm:space-x-4">
            <Link
              href="/"
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm sm:text-base
                ${pathname === '/'
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
                }`}
            >
              <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Validate</span>
            </Link>
            <Link
              href="/interview"
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all text-sm sm:text-base
                ${pathname === '/interview'
                  ? 'bg-white/20 text-white'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'
                }`}
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Interview</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
