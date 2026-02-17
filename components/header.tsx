'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              アメモバ Google口コミモニター
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex space-x-4">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              ダッシュボード
            </Link>
            <Link
              href="/reviews"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === '/reviews'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              口コミ一覧
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
