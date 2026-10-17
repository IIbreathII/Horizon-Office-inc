'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMe } from '@/shared/api/queries';
import { ICONS } from '@/shared/icons';
import { GLASS } from './glass';
import { Icon } from './Icon';
import { LineIcon } from './LineIcon';

// `icon` is an image from public/icons/nav; the organization cabinet uses a line icon (no nav image for it).
const LINKS: { href: string; label: string; icon: string | 'building' }[] = [
  { href: '/map', label: 'Мапа', icon: ICONS.nav.map },
  { href: '/quests', label: 'Квести', icon: ICONS.nav.quests },
  { href: '/rewards', label: 'Нагороди', icon: ICONS.nav.rewards },
  { href: '/org', label: 'Кабінет організації', icon: 'building' },
  { href: '/profile', label: 'Профіль', icon: ICONS.nav.profile },
];

/**
 * Floating nav: a vertical rail on the left (sm+, centered, clear of the map's top bar),
 * a horizontal bar at the bottom-left on phones (the mascot sits bottom-right).
 */
export function VolunteerNav() {
  const pathname = usePathname();
  const { data: me } = useMe();

  // brighter outline than the shared GLASS ring, so the rail stands out on dark pages
  return (
    <nav
      aria-label="Головне меню"
      className={`fixed bottom-3 left-3 z-40 flex items-center gap-1 rounded-full p-1.5 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:flex-col ${GLASS} ring-1! ring-white/50! shadow-[0_0_20px_-6px_rgba(255,255,255,0.45)]!`}
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
            className={`flex size-10 items-center justify-center rounded-full transition-colors ${active ? 'bg-[#228fff]' : 'hover:bg-white/10'}`}
          >
            {link.icon === 'building' ? <LineIcon name="building" className="size-5 text-white" /> : <Icon src={link.icon} className="size-5" />}
          </Link>
        );
      })}
      {me && (
        <>
          <div className="mx-1 h-6 w-px bg-white/10 sm:mx-0 sm:my-1 sm:h-px sm:w-6" />
          <Link
            href="/profile"
            title={`Рівень ${me.level}`}
            aria-label={`Рівень ${me.level}`}
            className="px-1 sm:px-0 sm:pb-1"
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
