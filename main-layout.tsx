'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/app/utils';

const navItems = [
  { href: '/overview', label: 'Overview', icon: '◈' },
  { href: '/registry', label: 'Registry', icon: '⊞' },
  { href: '/ghost-data', label: 'Ghost Data', icon: '◎' },
  { href: '/policy', label: 'Policy', icon: '⊛' },
  { href: '/deletion', label: 'Deletion', icon: '⊘' },
  { href: '/proof', label: 'Proof', icon: '✦' },
  { href: '/integrations', label: 'Integrations', icon: '⊕' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-950">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-4 dark:border-gray-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900 text-xs font-bold text-white dark:bg-white dark:text-gray-900">
            C
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">Chameleon</p>
            <p className="text-xs text-gray-400">Demo console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-1.5 px-2 text-xs font-medium uppercase tracking-wider text-gray-400">
            Compliance
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  <span className="text-xs opacity-60">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          <a
            href="https://chameleondata.io"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <span>↗</span>
            chameleondata.io
          </a>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-12 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {navItems.find((n) => n.href === pathname)?.label ?? 'Console'}
          </p>
          <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Demo tenant · live
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
