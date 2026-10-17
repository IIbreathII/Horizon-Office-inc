'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { LineIcon, type LineIconName } from '@/shared/ui/LineIcon';
import { ACCENT_FILL, PANEL } from '@/shared/ui/surface';

type NavLink = { href: string; label: string; icon: LineIconName; isActive: (path: string) => boolean };

const LINKS: NavLink[] = [
  {
    href: '/org',
    label: 'Мої квести',
    icon: 'list',
    // the quest pages belong here too, except "new quest" which has its own item
    isActive: (path) => path === '/org' || (path.startsWith('/org/quests/') && path !== '/org/quests/new'),
  },
  { href: '/org/quests/new', label: 'Новий квест', icon: 'plus', isActive: (path) => path === '/org/quests/new' },
  { href: '/org/profile', label: 'Профіль організації', icon: 'building', isActive: (path) => path === '/org/profile' },
];

/**
 * Organization dashboard navigation: a glass sidebar on desktop, a scrollable bar on phones.
 * usePathname suspends under dynamic routes (/org/quests/[id]) with cacheComponents, so the
 * sidebar renders without a highlighted item until the pathname is known.
 */
export function OrgSidebar() {
  return (
    <Suspense fallback={<SidebarView pathname={null} />}>
      <ActiveSidebar />
    </Suspense>
  );
}

function ActiveSidebar() {
  return <SidebarView pathname={usePathname()} />;
}

function SidebarView({ pathname }: { pathname: string | null }) {
  return (
    <aside className="z-20 shrink-0 p-3 md:sticky md:top-0 md:h-dvh md:w-64 md:p-4">
      <nav aria-label="Кабінет організації" className={`flex h-full gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-3 ${PANEL}`}>
        <div className="mr-2 flex shrink-0 items-center gap-2.5 px-2 py-1.5 md:mr-0 md:mb-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-300/15 text-amber-300 ring-1 ring-amber-300/60">
            <LineIcon name="building" className="size-5" />
          </span>
          <span className="hidden text-sm leading-tight font-semibold text-white md:block">
            Кабінет
            <br />
            організації
          </span>
        </div>

        {LINKS.map((link) => {
          const active = pathname !== null && link.isActive(pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                active ? ACCENT_FILL : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <LineIcon name={link.icon} className="size-4" />
              {link.label}
            </Link>
          );
        })}

        <Link
          href="/map"
          className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap text-neutral-400 transition-colors outline-none hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-300 md:mt-auto md:border-t md:border-white/10 md:pt-4"
        >
          <LineIcon name="map" className="size-4" />
          Мапа волонтера
        </Link>
      </nav>
    </aside>
  );
}
