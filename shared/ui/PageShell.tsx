import { FONT_VARIABLES } from './fonts';
import { PageBackdrop } from './PageBackdrop';
import { PageTitle } from './PageTitle';

type PageShellProps = {
  title: string;
  subtitle?: string;
  /** Shown to the right of the title (e.g. the coin balance). */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

// Page frame for the non-map volunteer pages: dark backdrop behind the glass panels.
// Padding keeps content clear of the nav: the left rail on sm+, the bottom bar on phones.
export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <main className={`relative isolate min-h-dvh overflow-x-clip bg-[#050505] text-white ${FONT_VARIABLES}`}>
      <PageBackdrop />
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-28 sm:pr-6 sm:pb-10 sm:pl-20 md:pl-28">
        <PageTitle title={title} subtitle={subtitle} actions={actions} />
        {children}
      </div>
    </main>
  );
}

// Basic light styles used by the auth pages (white background).
// The volunteer and organization pages use the dark surfaces from ./surface instead.

/** Basic card surface. */
export const CARD = 'rounded-lg border border-gray-200 p-4';

/** Basic button. */
export const BUTTON = 'cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
