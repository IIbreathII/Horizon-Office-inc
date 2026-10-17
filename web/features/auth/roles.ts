import type { Role } from '@/shared/types';

// Registration flow: /register (account) → /register/role (this choice) → the role's next step.
// Volunteers need nothing more and go straight to the map; organizations fill in their profile first.
// Illustrations live in public/img (black line art on white).
export const ROLES: Record<Role, { label: string; next: string; image: { src: string; width: number; height: number } }> = {
  organization: {
    label: 'Створити організацію',
    next: '/register/organization',
    image: { src: '/img/organisation.png', width: 1133, height: 1388 },
  },
  volunteer: {
    label: 'Волонтер',
    next: '/map',
    image: { src: '/img/volontier.png', width: 1254, height: 1254 },
  },
};

/** Card order on /register/role (as in the design). */
export const ROLE_ORDER: Role[] = ['organization', 'volunteer'];
