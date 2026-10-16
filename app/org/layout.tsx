import Link from 'next/link';

// Organization dashboard (doc §5, §7): sidebar + content, basic styles.
const LINKS = [
  { href: '/org', label: 'Мої квести' },
  { href: '/org/quests/new', label: 'Новий квест' },
  { href: '/org/profile', label: 'Профіль організації' },
  { href: '/map', label: 'Мапа волонтера' },
];

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-white text-gray-900">
      <aside className="w-56 shrink-0 border-r border-gray-200 p-4">
        <p className="mb-4 font-semibold">Кабінет організації</p>
        <nav className="flex flex-col gap-1 text-sm">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded px-2 py-1.5 hover:bg-gray-100">
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
