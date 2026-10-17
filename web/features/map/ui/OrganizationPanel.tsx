'use client';

import { ICONS } from '@/shared/icons';
import type { Organization } from '@/shared/types';
import { GLASS } from '@/shared/ui/glass';
import { Icon } from '@/shared/ui/Icon';
import { Drawer } from './Drawer';

type OrganizationPanelProps = {
  organizations: Organization[];
  /** Selected organization ids; [] = all. */
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Quests on the map per organization id (after the category filter). */
  questCounts: Record<string, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Phones and tablets: a drawer from the left edge instead of the floating panel. */
  drawer?: boolean;
};

/** Left side panel: pick the organizations whose quests are shown on the map. */
export function OrganizationPanel({ organizations, selected, onChange, questCounts, open, onOpenChange, drawer = false }: OrganizationPanelProps) {
  const filtered = selected.length > 0;
  const openButton = (
    <button
      type="button"
      onClick={() => onOpenChange(true)}
      aria-expanded={open}
      className={`fixed top-16 left-4 z-20 h-10 cursor-pointer rounded-full px-4 text-sm font-medium ${GLASS} ${filtered ? 'bg-[#228fff]! ring-[#228fff]/40!' : 'hover:bg-neutral-800/90'}`}
    >
      Організації · {filtered ? `${selected.length} / ${organizations.length}` : organizations.length}
    </button>
  );
  const list = <OrganizationList organizations={organizations} selected={selected} onChange={onChange} questCounts={questCounts} />;

  // the drawer stays mounted so it can slide out; several organizations can be picked before closing it
  if (drawer) {
    return (
      <>
        {openButton}
        <Drawer title={`Організації (${organizations.length})`} side="left" open={open} onOpenChange={onOpenChange}>
          {list}
        </Drawer>
      </>
    );
  }

  if (!open) return openButton;

  return (
    // right of VolunteerNav; content height (not to the bottom edge), so the OSM attribution stays visible
    <aside className={`fixed inset-x-3 top-28 z-20 flex max-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl sm:inset-x-auto sm:top-16 sm:left-20 sm:max-h-[calc(100dvh-6rem)] sm:w-72 ${GLASS}`}>
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-white/10 pr-2 pl-4">
        <h2 className="text-sm font-semibold">Організації ({organizations.length})</h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Сховати панель"
          className="cursor-pointer rounded-full p-2 opacity-60 hover:bg-white/10 hover:opacity-100"
        >
          <Icon src={ICONS.close} className="size-3.5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
    </aside>
  );
}

function OrganizationList({
  organizations,
  selected,
  onChange,
  questCounts,
}: Pick<OrganizationPanelProps, 'organizations' | 'selected' | 'onChange' | 'questCounts'>) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <ul className="py-1">
      <li>
        <OrganizationRow active={selected.length === 0} onClick={() => onChange([])}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
            Всі
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">Усі організації</span>
        </OrganizationRow>
      </li>
      {organizations.map((org) => (
        <li key={org.id}>
          <OrganizationRow active={selected.includes(org.id)} onClick={() => toggle(org.id)}>
            <OrganizationLogo organization={org} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{org.name}</span>
              {org.description && <span className="block truncate text-xs text-white/60">{org.description}</span>}
              <span className="flex gap-3 text-xs text-white/50">
                {org.trustScore !== null && <span className="text-amber-300">★ {org.trustScore.toFixed(1)}</span>}
                <span>Квестів: {questCounts[org.id] ?? 0}</span>
              </span>
            </span>
          </OrganizationRow>
        </li>
      ))}
    </ul>
  );
}

function OrganizationRow({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left ${active ? 'bg-[#228fff]/25' : 'hover:bg-white/10'}`}
    >
      {children}
      <span
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${active ? 'border-[#228fff] bg-[#228fff]' : 'border-white/30'}`}
        aria-hidden
      >
        {active && '✓'}
      </span>
    </button>
  );
}

/** Logo or, while organizations have none, the first letter of the name without its «ГО»/«БФ» prefix. */
function OrganizationLogo({ organization }: { organization: Organization }) {
  if (organization.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- user-uploaded logo from the API
    return <img src={organization.logoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />;
  }
  const letter = (organization.name.match(/«(.)/)?.[1] ?? organization.name[0] ?? '?').toUpperCase();
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#228fff]/30 text-sm font-semibold">
      {letter}
    </span>
  );
}
