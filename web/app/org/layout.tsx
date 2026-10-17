import { OrgGate } from '@/features/org/OrgGate';
import { OrgSidebar } from '@/features/org/OrgSidebar';
import { FONT_VARIABLES } from '@/shared/ui/fonts';
import { FieldTone } from '@/shared/ui/FormFields';
import { PageBackdrop } from '@/shared/ui/PageBackdrop';

// Organization dashboard (doc §5, §7), signed-in users only (proxy.ts checks): glass sidebar + content on the same
// dark backdrop as the volunteer pages.
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`relative isolate flex min-h-dvh flex-col bg-[#050505] text-white md:flex-row ${FONT_VARIABLES}`}>
      <PageBackdrop />
      <OrgSidebar />
      {/* phones: bottom padding keeps the content clear of the floating nav bar */}
      <main className="min-w-0 flex-1 px-4 pt-8 pb-28 sm:px-6 md:pt-10 md:pr-8 md:pb-10">
        <div className="mx-auto max-w-6xl">
          <FieldTone tone="dark">
            <OrgGate>{children}</OrgGate>
          </FieldTone>
        </div>
      </main>
    </div>
  );
}
