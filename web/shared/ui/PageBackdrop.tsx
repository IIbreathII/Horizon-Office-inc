import { PageDecor } from './PageDecor';

/** Fixed dark backdrop shared by the volunteer and organization areas: ambient light + background decor. */
export function PageBackdrop() {
  return (
    <>
      {/* ambient light: gives the translucent panels something to blur */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(55rem_38rem_at_85%_-10%,rgba(34,143,255,0.16),transparent_65%),radial-gradient(45rem_32rem_at_-10%_110%,rgba(251,191,36,0.10),transparent_65%)]"
      />
      <PageDecor />
    </>
  );
}
