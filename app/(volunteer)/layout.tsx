import { VolunteerNav } from '@/shared/ui/VolunteerNav';

// Volunteer area: the navigation rail floats over every page (the map stays full-bleed under it).
export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <VolunteerNav />
    </>
  );
}
