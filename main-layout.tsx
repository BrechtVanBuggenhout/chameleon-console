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
          <svg width="28" height="28" viewBox="0 0 158 118" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flex: "none" }}>
            <defs>
              <linearGradient id="con-g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#62C53C"/>
                <stop offset="100%" stopColor="#15A082"/>
              </linearGradient>
              <linearGradient id="con-g2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#62C53C"/>
                <stop offset="100%" stopColor="#3FB463"/>
              </linearGradient>
            </defs>
            <rect x="76" y="34" width="76" height="76" rx="24" fill="url(#con-g1)"/>
            <rect x="88" y="30" width="22" height="22" rx="7" fill="url(#con-g2)" opacity=".95"/>
            <rect x="64" y="18" width="20" height="20" rx="6" fill="#5BC740" opacity=".88"/>
            <rect x="90" y="6"  width="15" height="15" rx="5" fill="#6CCF44" opacity=".74"/>
            <rect x="44" y="30" width="18" height="18" rx="6" fill="#74D446" opacity=".68"/>
            <rect x="78" y="54" width="13" height="13" rx="5" fill="#3FBE74" opacity=".58"/>
            <rect x="66" y="0"  width="14" height="14" rx="5" fill="#82DC49" opacity=".62"/>
            <rect x="28" y="18" width="14" height="14" rx="5" fill="#8FE74E" opacity=".52"/>
            <rect x="48" y="8"  width="12" height="12" rx="4" fill="#97ED50" opacity=".48"/>
            <rect x="50" y="50" width="10" height="10" rx="4" fill="#5FD088" opacity=".44"/>
            <rect x="14" y="6"  width="11" height="11" rx="4" fill="#9DF453" opacity=".40"/>
            <rect x="30" y="44" width="9"  height="9"  rx="3" fill="#a3ff57" opacity=".42"/>
            <rect x="2"  y="24" width="9"  height="9"  rx="3" fill="#a3ff57" opacity=".32"/>
            <rect x="16" y="50" width="7"  height="7"  rx="3" fill="#a3ff57" opacity=".24"/>
            <rect x="0"  y="46" width="6"  height="6"  rx="2" fill="#a3ff57" opacity=".16"/>
          </svg>
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
            href="https://chameleon-data.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <span>↗</span>
            chameleon-data.com
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
