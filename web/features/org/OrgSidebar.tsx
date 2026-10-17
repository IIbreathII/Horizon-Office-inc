'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { SignOutButton } from '@/features/auth/SignOutButton';
import { LineIcon, type LineIconName } from '@/shared/ui/LineIcon';
import { ACCENT_FILL, PANEL } from '@/shared/ui/surface';
import { ORG_PROFILE_PATH, useNeedsOrgProfile } from './OrgGate';

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
 * Organization dashboard navigation: a glass sidebar on desktop, a floating icon bar at the bottom on phones.
 * usePathname suspends under dynamic routes (/org/quests/[id]) with cacheComponents, so the
 * sidebar renders without a highlighted item until the pathname is known.
 */
export function OrgSidebar() {
  // no organization profile yet: only the profile tab works (see OrgGate)
  const locked = useNeedsOrgProfile();
  return (
    <Suspense fallback={<SidebarView pathname={null} locked={locked} />}>
      <ActiveSidebar locked={locked} />
    </Suspense>
  );
}

function ActiveSidebar({ locked }: { locked: boolean }) {
  return <SidebarView pathname={usePathname()} locked={locked} />;
}

// Phones: round icon buttons, the label is only for screen readers and the tooltip. md+: icon and label.
const ITEM =
  'flex size-11 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-300 md:size-auto md:justify-start md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-sm md:whitespace-nowrap';

function SidebarView({ pathname, locked }: { pathname: string | null; locked: boolean }) {
  return (
    // phones: a floating bar at the bottom (like the volunteer nav); md+: a sticky sidebar
    <aside className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center md:pointer-events-auto md:sticky md:top-0 md:bottom-auto md:z-20 md:h-dvh md:w-64 md:shrink-0 md:p-4">
      <nav
        aria-label="Кабінет організації"
        className={`pointer-events-auto flex items-center gap-1 p-1.5 md:h-full md:w-full md:flex-col md:items-stretch md:p-3 ${PANEL} rounded-full! md:rounded-2xl!`}
      >
        <div className="mb-4 hidden shrink-0 items-center gap-2.5 px-2 py-1.5 md:flex">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-300/15 text-amber-300 ring-1 ring-amber-300/60">
            <LineIcon name="building" className="size-5" />
          </span>
          <span className="text-sm leading-tight font-semibold text-white">
            Кабінет
            <br />
            організації
          </span>
        </div>

        {LINKS.map((link) => {
          const active = pathname !== null && link.isActive(pathname);
          if (locked && link.href !== ORG_PROFILE_PATH) {
            const hint = `${link.label}: спочатку заповніть профіль організації`;
            return (
              <span key={link.href} aria-disabled="true" title={hint} className={`${ITEM} cursor-not-allowed font-medium text-neutral-500`}>
                <LineIcon name="lock" className="size-5 md:size-4" />
                <span className="sr-only md:not-sr-only">{link.label}</span>
              </span>
            );
          }
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              aria-current={active ? 'page' : undefined}
              className={`${ITEM} font-medium ${active ? ACCENT_FILL : 'text-neutral-300 hover:bg-white/[0.06] hover:text-white'}`}
            >
              <LineIcon name={link.icon} className="size-5 md:size-4" />
              <span className="sr-only md:not-sr-only">{link.label}</span>
            </Link>
          );
        })}

        <div className="mx-1 h-6 w-px bg-white/10 md:hidden" aria-hidden />
        <Link
          href="/map"
          title="Мапа волонтера"
          className={`${ITEM} text-neutral-400 hover:bg-white/[0.06] hover:text-white md:mt-auto md:border-t md:border-white/10 md:pt-4`}
        >
          <LineIcon name="map" className="size-5 md:size-4" />
          <span className="sr-only md:not-sr-only">Мапа волонтера</span>
        </Link>
        <SignOutButton
          className={`${ITEM} cursor-pointer text-neutral-400 hover:bg-white/[0.06] hover:text-white`}
          labelClassName="sr-only md:not-sr-only"
        />
      </nav>
    </aside>
  );
}
