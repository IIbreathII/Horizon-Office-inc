'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/shared/api/queries';
import { ICONS } from '@/shared/icons';
import { GLASS } from './glass';
import { Icon } from './Icon';

const LINKS = [
  { href: '/map', label: 'Мапа', icon: ICONS.nav.map },
  { href: '/quests', label: 'Квести', icon: ICONS.nav.quests },
  { href: '/rewards', label: 'Нагороди', icon: ICONS.nav.rewards },
  { href: '/profile', label: 'Профіль', icon: ICONS.nav.profile },
];

/** Floating vertical rail on the left, vertically centered (clear of the map's top bar). */
export function VolunteerNav() {
  const pathname = usePathname();
  const { data: me } = useMe();

  return (
    <nav
      aria-label="Головне меню"
      className={`fixed top-1/2 left-3 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full p-1.5 ${GLASS}`}
    >
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.label}
            title={link.label}
            aria-current={active ? 'page' : undefined}
            className={`flex size-10 items-center justify-center rounded-full transition-colors ${active ? 'bg-indigo-500' : 'hover:bg-white/10'}`}
          >
            <Icon src={link.icon} className="size-5" />
          </Link>
        );
      })}
      {me && (
        <>
          <div className="my-1 h-px w-6 bg-white/10" />
          <Link
            href="/profile"
            title={`Рівень ${me.level}`}
            aria-label={`Рівень ${me.level}`}
            className="pb-1"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">
              {me.level}
            </span>
          </Link>
        </>
      )}
    </nav>
  );
}
