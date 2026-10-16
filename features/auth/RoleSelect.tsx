import type { Role } from '@/shared/types';

// Illustrations (add the files): public/images/auth/organization.png, public/images/auth/volunteer.png
const ROLES: { role: Role; label: string; image: string }[] = [
  { role: 'organization', label: 'Створити організацію', image: '/images/auth/organization.png' },
  { role: 'volunteer', label: 'Волонтер', image: '/images/auth/volunteer.png' },
];

export function RoleSelect({ onSelect }: { onSelect: (role: Role) => void }) {
  return (
    <div className="grid w-full max-w-3xl grid-cols-2 gap-8">
      {ROLES.map(({ role, label, image }) => (
        <button
          key={role}
          type="button"
          onClick={() => onSelect(role)}
          className="flex cursor-pointer flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-6 hover:border-gray-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- placeholder asset, styles later */}
          <img src={image} alt="" className="h-56 w-full object-contain" />
          <span className="text-xl font-semibold">{label}</span>
        </button>
      ))}
    </div>
  );
}
