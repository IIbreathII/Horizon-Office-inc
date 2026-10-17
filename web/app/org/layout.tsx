import { OrgSidebar } from '@/features/org/OrgSidebar';
import { FONT_VARIABLES } from '@/shared/ui/fonts';
import { FieldTone } from '@/shared/ui/FormFields';
import { PageBackdrop } from '@/shared/ui/PageBackdrop';

// Organization dashboard (doc §5, §7): glass sidebar + content on the same dark backdrop as the volunteer pages.
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`relative isolate flex min-h-dvh flex-col bg-[#050505] text-white md:flex-row ${FONT_VARIABLES}`}>
      <PageBackdrop />
      <OrgSidebar />
      <main className="min-w-0 flex-1 px-4 pt-4 pb-10 sm:px-6 md:pt-10 md:pr-8">
        <div className="mx-auto max-w-6xl">
          <FieldTone tone="dark">{children}</FieldTone>
        </div>
      </main>
    </div>
  );
}
