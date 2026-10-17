import { AssistantDock } from '@/features/assistant/AssistantDock';
import { MascotProvider } from '@/features/assistant/MascotProvider';
import { VolunteerNav } from '@/shared/ui/VolunteerNav';

// Volunteer area (signed-in users; proxy.ts checks): the navigation rail and the mascot-assistant float
// over every page (the map stays full-bleed under them). MascotProvider lets any page make the mascot react.
export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return (
    <MascotProvider>
      {children}
      <VolunteerNav />
      <AssistantDock />
    </MascotProvider>
  );
}
