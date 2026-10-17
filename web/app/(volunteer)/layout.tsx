import { RequireAuth } from '@/features/auth/guards';
import { VolunteerNav } from '@/shared/ui/VolunteerNav';

// Volunteer area (signed-in users): the navigation rail floats over every page (the map stays full-bleed under it).
export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      {children}
      <VolunteerNav />
    </RequireAuth>
  );
}
