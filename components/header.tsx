'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/version';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <Link href="/" className="inline-flex items-start gap-1.5 hover:opacity-80 transition-opacity group" aria-label="アメレモ トップへ">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">アメレモ</h1>
              <span className="inline-flex items-center justify-center text-[11px] font-medium px-1 py-0.5 rounded bg-gray-200 text-gray-600 group-hover:bg-gray-300 leading-none mt-0.5" aria-label={`バージョン ${APP_VERSION}`}>v{APP_VERSION}</span>
            </Link>
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
              集計
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
