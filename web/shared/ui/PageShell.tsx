// Basic page frame for the non-map volunteer pages; the left padding keeps content clear of the nav rail.
export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-white py-8 pr-8 pl-28 text-gray-900">
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

/** Basic card surface. */
export const CARD = 'rounded-lg border border-gray-200 p-4';

/** Basic button. */
export const BUTTON = 'cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';
