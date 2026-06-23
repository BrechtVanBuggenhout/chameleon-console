'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/app/utils';

const navItems = [
  { href: '/overview', label: 'Overview' },
  { href: '/registry', label: 'Registry' },
  { href: '/ghost-data', label: 'Ghost Data' },
  { href: '/policy', label: 'Policy' },
  { href: '/deletion', label: 'Deletion' },
  { href: '/proof', label: 'Proof' },
  { href: '/integrations', label: 'Integrations' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      <aside className="w-64 flex-shrink-0 border-r bg-white dark:bg-black dark:border-gray-800">
        <div className="p-4 border-b dark:border-gray-800">
          <h1 className="text-xl font-bold">Chameleon</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'block px-3 py-2 rounded-md text-sm font-medium',
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50'
                      : 'text-gray-600 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">{children}</main>
    </div>
  );
}