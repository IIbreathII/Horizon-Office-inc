import { DISPLAY, FONT_VARIABLES } from './fonts';
import { PageDecor } from './PageDecor';

type PageShellProps = {
  title: string;
  subtitle?: string;
  /** Shown to the right of the title (e.g. the coin balance). */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

// Page frame for the non-map volunteer pages: deep blue with soft ambient light behind the glass panels.
// The left padding keeps content clear of the nav rail, which stays on the left on every width.
export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <main className={`relative isolate min-h-dvh overflow-x-clip bg-[#050505] text-white ${FONT_VARIABLES}`}>
      {/* ambient light: gives the translucent panels something to blur */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(55rem_38rem_at_85%_-10%,rgba(34,143,255,0.16),transparent_65%),radial-gradient(45rem_32rem_at_-10%_110%,rgba(251,191,36,0.10),transparent_65%)]"
      />
      <PageDecor />

      <div className="mx-auto max-w-6xl py-10 pr-4 pl-20 sm:pr-6 md:pl-28">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className={`text-3xl font-semibold tracking-tight text-white sm:text-4xl ${DISPLAY}`}>{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-neutral-300">{subtitle}</p>}
          </div>
          {actions}
        </header>
        {children}
      </div>
    </main>
  );
}

// Basic light styles used by the auth and organization pages (white background).
// The volunteer pages use the dark surfaces from ./surface instead.

/** Basic card surface. */
export const CARD = 'rounded-lg border border-gray-200 p-4';

/** Basic button. */
export const BUTTON = 'cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
